import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface ParticipantDetail {
  name: string;
  photoUrl?: string | null;
  email?: string;
  department?: string;
  role?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: Record<string, ParticipantDetail>;
  lastMessage: string;
  lastMessageSenderId: string;
  lastMessageTimestamp: Date;
  unreadCounts: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  clientMessageId?: string;
  delivery?: 'sending' | 'sent' | 'failed';
}

const TRUSTED_BACKEND_BASE_URL =
  import.meta.env.VITE_TRUSTED_BACKEND_URL ||
  'https://fuvquwhphuheqgfdmtbh.supabase.co/functions/v1';

export function getPairId(uid1: string, uid2: string): string {
  return uid1.localeCompare(uid2) < 0 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

export function generateClientMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'msg-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Subscribe to all conversations for the authenticated user.
 */
export function subscribeToConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) return () => {};

  const convsRef = collection(db, 'conversations');
  const q = query(
    convsRef,
    where('participants', 'array-contains', userId),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Conversation[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        let lastMsgDate = new Date();
        const ts = data.lastMessageTimestamp || data.updatedAt || data.createdAt;
        if (ts instanceof Timestamp) {
          lastMsgDate = ts.toDate();
        } else if (ts && typeof ts.toDate === 'function') {
          lastMsgDate = ts.toDate();
        } else if (typeof ts === 'number') {
          lastMsgDate = new Date(ts);
        }

        list.push({
          id: d.id,
          participants: Array.isArray(data.participants) ? data.participants : [],
          participantDetails: data.participantDetails || {},
          lastMessage: String(data.lastMessage || ''),
          lastMessageSenderId: String(data.lastMessageSenderId || ''),
          lastMessageTimestamp: lastMsgDate,
          unreadCounts: data.unreadCounts || {},
        });
      }

      list.sort((a, b) => b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime());
      onUpdate(list);
    },
    (error) => {
      console.warn('[chatService] subscribeToConversations error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to messages in an active conversation.
 */
export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!conversationId) return () => {};

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        let msgDate = new Date();
        const ts = data.timestamp;
        if (ts instanceof Timestamp) {
          msgDate = ts.toDate();
        } else if (ts && typeof ts.toDate === 'function') {
          msgDate = ts.toDate();
        } else if (typeof ts === 'number') {
          msgDate = new Date(ts);
        }

        messages.push({
          id: d.id,
          senderId: String(data.senderId || ''),
          receiverId: String(data.receiverId || ''),
          content: String(data.content || ''),
          timestamp: msgDate,
          isRead: Boolean(data.isRead),
          clientMessageId: data.clientMessageId,
          delivery: 'sent',
        });
      }
      onUpdate(messages);
    },
    (error) => {
      console.warn('[chatService] subscribeToMessages error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Send a message using the trusted send-message Supabase Edge Function with optimistic fallback.
 */
export async function sendChatMessage({
  conversationId,
  senderId,
  receiverId,
  content,
  idToken,
  clientMessageId,
}: {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  idToken: string;
  clientMessageId?: string;
}): Promise<{ messageId?: string; ok: boolean }> {
  const cleanContent = content.trim();
  if (!cleanContent) throw new Error('Message cannot be empty.');
  const requestId = clientMessageId || generateClientMessageId();

  const endpoint = `${TRUSTED_BACKEND_BASE_URL.replace(/\/+$/, '')}/send-message`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversationId,
      content: cleanContent,
      clientMessageId: requestId,
      senderId,
      receiverId,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || `Failed to send message (HTTP ${response.status})`);
  }

  const data = await response.json();
  return {
    messageId: data.messageId,
    ok: true,
  };
}

/**
 * Mark all messages in a conversation as read for the given user.
 */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  if (!conversationId || !userId) return;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCounts.${userId}`]: 0,
    });
  } catch (err) {
    console.warn('[chatService] markConversationRead failed:', err);
  }
}

/**
 * Create or retrieve a 1-on-1 conversation between two users.
 */
export async function getOrCreateConversation({
  currentUserId,
  currentUserName,
  currentUserPhoto,
  targetUserId,
  targetUserName,
  targetUserPhoto,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserPhoto?: string | null;
  targetUserId: string;
  targetUserName: string;
  targetUserPhoto?: string | null;
}): Promise<string> {
  const pairId = getPairId(currentUserId, targetUserId);
  const convRef = doc(db, 'conversations', pairId);
  const snap = await getDoc(convRef);

  if (snap.exists()) {
    return pairId;
  }

  await setDoc(convRef, {
    participants: [currentUserId, targetUserId],
    participantDetails: {
      [currentUserId]: {
        name: currentUserName,
        photoUrl: currentUserPhoto || null,
      },
      [targetUserId]: {
        name: targetUserName,
        photoUrl: targetUserPhoto || null,
      },
    },
    lastMessage: 'Conversation started.',
    lastMessageSenderId: currentUserId,
    lastMessageTimestamp: serverTimestamp(),
    unreadCounts: {
      [currentUserId]: 0,
      [targetUserId]: 0,
    },
    createdAt: serverTimestamp(),
  });

  return pairId;
}

/**
 * Search users by name or email to start new conversations.
 */
export async function searchChatUsers(queryText: string, currentUserId: string): Promise<Array<{ uid: string; name: string; email?: string; photoUrl?: string }>> {
  const cleanQuery = queryText.trim().toLowerCase();
  if (!cleanQuery) return [];

  const usersRef = collection(db, 'users');
  const snap = await getDocs(query(usersRef, limit(40)));
  const results: Array<{ uid: string; name: string; email?: string; photoUrl?: string }> = [];

  for (const d of snap.docs) {
    if (d.id === currentUserId) continue;
    const data = d.data();
    const name = String(data.name || data.displayName || 'User');
    const email = String(data.email || '');
    if (name.toLowerCase().includes(cleanQuery) || email.toLowerCase().includes(cleanQuery)) {
      results.push({
        uid: d.id,
        name,
        email: email || undefined,
        photoUrl: data.photoUrl || undefined,
      });
    }
  }

  return results;
}
