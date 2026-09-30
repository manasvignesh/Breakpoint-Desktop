import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  UserPlus,
  Check,
  Clock,
  AlertCircle,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendChatMessage,
  markConversationRead,
  getOrCreateConversation,
  searchChatUsers,
  type Conversation,
  type ChatMessage,
  generateClientMessageId,
} from '../services/chatService';

interface ChatViewProps {
  initialConversationId?: string | null;
  onOpenArticle?: (articleId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ initialConversationId }) => {
  const { firebaseUser, userProfile, getIdToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingNewUser, setIsSearchingNewUser] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<
    Array<{ uid: string; name: string; email?: string; photoUrl?: string }>
  >([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to user conversations
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setConversations([]);
      return;
    }

    const unsubscribe = subscribeToConversations(
      firebaseUser.uid,
      (list) => {
        setConversations(list);
        if (!activeConversationId && list.length > 0 && !initialConversationId) {
          setActiveConversationId(list[0].id);
        }
      },
      (err) => console.warn('[ChatView] Conversations error:', err)
    );

    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  // Set initial conversation if provided
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  // Subscribe to active conversation messages
  useEffect(() => {
    if (!activeConversationId || !firebaseUser?.uid) {
      setMessages([]);
      return;
    }

    // Mark as read
    markConversationRead(activeConversationId, firebaseUser.uid);

    const unsubscribe = subscribeToMessages(
      activeConversationId,
      (msgs) => {
        setMessages(msgs);
        // Clear matching optimistic messages that have arrived from server
        setOptimisticMessages((prev) =>
          prev.filter(
            (opt) =>
              !msgs.some(
                (m) =>
                  (opt.clientMessageId && m.clientMessageId === opt.clientMessageId) ||
                  (m.senderId === opt.senderId &&
                    m.content === opt.content &&
                    Math.abs(m.timestamp.getTime() - opt.timestamp.getTime()) < 10000)
              )
          )
        );
      },
      (err) => console.warn('[ChatView] Messages error:', err)
    );

    return () => unsubscribe();
  }, [activeConversationId, firebaseUser?.uid]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const partnerId = activeConversation?.participants.find((p) => p !== firebaseUser?.uid) || '';
  const partnerDetails = activeConversation?.participantDetails[partnerId] || {
    name: 'Student Partner',
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || !activeConversationId || !firebaseUser || !partnerId) return;

    const clientMsgId = generateClientMessageId();
    const optimisticMsg: ChatMessage = {
      id: `opt_${clientMsgId}`,
      senderId: firebaseUser.uid,
      receiverId: partnerId,
      content: cleanText,
      timestamp: new Date(),
      isRead: false,
      clientMessageId: clientMsgId,
      delivery: 'sending',
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Session expired.');

      await sendChatMessage({
        conversationId: activeConversationId,
        senderId: firebaseUser.uid,
        receiverId: partnerId,
        content: cleanText,
        idToken: token,
        refreshToken: getIdToken,
        clientMessageId: clientMsgId,
      });

      // Update optimistic state to sent
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.clientMessageId === clientMsgId ? { ...m, delivery: 'sent' } : m))
      );
    } catch (err: any) {
      console.error('[ChatView] Send message failed:', err);
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.clientMessageId === clientMsgId ? { ...m, delivery: 'failed' } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryOptimistic = async (optMsg: ChatMessage) => {
    if (!optMsg.clientMessageId || !activeConversationId || !firebaseUser || !partnerId) return;

    setOptimisticMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === optMsg.clientMessageId ? { ...m, delivery: 'sending' } : m
      )
    );

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Session expired.');

      await sendChatMessage({
        conversationId: activeConversationId,
        senderId: firebaseUser.uid,
        receiverId: partnerId,
        content: optMsg.content,
        idToken: token,
        refreshToken: getIdToken,
        clientMessageId: optMsg.clientMessageId,
      });
    } catch (err) {
      setOptimisticMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === optMsg.clientMessageId ? { ...m, delivery: 'failed' } : m
        )
      );
    }
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim() || !firebaseUser) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const res = await searchChatUsers(q, firebaseUser.uid);
      setUserSearchResults(res);
    } catch (err) {
      console.warn('[ChatView] Search users failed:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleStartConversationWithUser = async (targetUser: {
    uid: string;
    name: string;
    photoUrl?: string;
  }) => {
    if (!firebaseUser) return;
    try {
      const convId = await getOrCreateConversation({
        currentUserId: firebaseUser.uid,
        currentUserName: userProfile?.name || firebaseUser.displayName || 'Reader',
        currentUserPhoto: userProfile?.photoUrl || firebaseUser.photoURL,
        targetUserId: targetUser.uid,
        targetUserName: targetUser.name,
        targetUserPhoto: targetUser.photoUrl,
      });
      setActiveConversationId(convId);
      setIsSearchingNewUser(false);
      setSearchQuery('');
      setUserSearchResults([]);
    } catch (err) {
      console.error('[ChatView] Start conversation failed:', err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const pId = c.participants.find((p) => p !== firebaseUser?.uid) || '';
    const name = c.participantDetails[pId]?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const allDisplayMessages = [...messages, ...optimisticMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  if (!firebaseUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center mb-4">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold font-display text-white mb-2">Breakpoint Chat</h3>
        <p className="text-sm text-[#8B949E] max-w-md mb-6">
          Connect, collaborate, and exchange engineering insights directly with colleagues and students.
        </p>
        <span className="text-xs text-[#8B949E]">
          Please sign in to access your direct messages.
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#0F1015] border border-[#232734] rounded-2xl overflow-hidden shadow-2xl">
      {/* Left Pane: Conversation List */}
      <aside className="w-80 md:w-88 border-r border-[#232734] bg-[#0A0B0E] flex flex-col shrink-0">
        {/* Header & Search */}
        <div className="p-4 border-b border-[#232734] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base font-display text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#FF5A1F]" />
              <span>Direct Messages</span>
            </h3>
            <button
              onClick={() => setIsSearchingNewUser(!isSearchingNewUser)}
              className="p-1.5 rounded-lg bg-[#181B22] hover:bg-[#232734] border border-[#232734] text-[#8B949E] hover:text-[#F0F3F6] transition"
              title="Start new conversation"
            >
              <UserPlus className="w-4 h-4 text-[#FF5A1F]" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                isSearchingNewUser ? handleSearchUsers(e.target.value) : setSearchQuery(e.target.value)
              }
              placeholder={isSearchingNewUser ? 'Search users to message...' : 'Filter conversations...'}
              className="w-full pl-8 pr-3 py-1.5 bg-[#12141A] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-xs text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
            />
          </div>
        </div>

        {/* User Search Dropdown / Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#232734]/40">
          {isSearchingNewUser ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider">
                <span>Search People</span>
                <button
                  onClick={() => {
                    setIsSearchingNewUser(false);
                    setSearchQuery('');
                  }}
                  className="hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {isSearchingUsers && (
                <div className="p-4 text-center text-xs text-[#8B949E]">Searching directory...</div>
              )}

              {!isSearchingUsers && userSearchResults.length === 0 && searchQuery && (
                <div className="p-4 text-center text-xs text-[#8B949E]">No users found.</div>
              )}

              {userSearchResults.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => handleStartConversationWithUser(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#181B22] text-left transition"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FF5A1F]/20 border border-[#FF5A1F]/40 flex items-center justify-center text-xs font-bold text-[#FF5A1F] shrink-0">
                    {u.name[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#F0F3F6] truncate">{u.name}</p>
                    <p className="text-[10px] text-[#8B949E] truncate">{u.email || 'Breakpoint user'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8B949E] space-y-2">
                  <p>No conversations yet.</p>
                  <button
                    onClick={() => setIsSearchingNewUser(true)}
                    className="text-xs text-[#FF5A1F] hover:underline font-medium"
                  >
                    + Start a conversation
                  </button>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const pId = c.participants.find((p) => p !== firebaseUser.uid) || '';
                  const details = c.participantDetails[pId] || { name: 'Student' };
                  const unread = c.unreadCounts[firebaseUser.uid] || 0;
                  const isActive = c.id === activeConversationId;

                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveConversationId(c.id)}
                      className={`w-full flex items-center gap-3 p-3.5 text-left transition ${
                        isActive
                          ? 'bg-[#181B22] border-l-4 border-[#FF5A1F]'
                          : 'hover:bg-[#12141A]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#FF5A1F]/20 border border-[#FF5A1F]/30 flex items-center justify-center text-xs font-bold text-[#FF5A1F] shrink-0">
                        {details.name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-xs font-bold text-[#F0F3F6] truncate">
                            {details.name}
                          </h4>
                          <span className="text-[10px] text-[#8B949E] shrink-0">
                            {c.lastMessageTimestamp
                              ? new Date(c.lastMessageTimestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        <p className="text-xs text-[#8B949E] truncate">{c.lastMessage}</p>
                      </div>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#FF5A1F] text-white text-[10px] font-bold shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      </aside>

      {/* Right Pane: Active Chat Conversation */}
      <main className="flex-1 flex flex-col bg-[#0F1015] min-w-0">
        {activeConversationId ? (
          <>
            {/* Chat Top Header */}
            <header className="h-16 px-6 border-b border-[#232734] bg-[#0F1015]/90 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#FF5A1F]/20 border border-[#FF5A1F]/40 flex items-center justify-center text-sm font-bold text-[#FF5A1F] shrink-0">
                  {partnerDetails.name[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold font-display text-white truncate">
                    {partnerDetails.name}
                  </h3>
                  <p className="text-[10px] text-[#8B949E] truncate">
                    {partnerDetails.email || 'Direct Connection'}
                  </p>
                </div>
              </div>
            </header>

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {allDisplayMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-xs text-[#8B949E]">
                  <MessageSquare className="w-8 h-8 text-[#232734] mb-2" />
                  <p>No messages yet. Send a greeting to start chatting!</p>
                </div>
              ) : (
                allDisplayMessages.map((m) => {
                  const isMe = m.senderId === firebaseUser.uid;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <div
                        className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                          isMe
                            ? 'bg-[#FF5A1F] text-white rounded-tr-none'
                            : 'bg-[#181B22] border border-[#232734] text-[#F0F3F6] rounded-tl-none'
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Timestamp & Delivery State */}
                      <div className="flex items-center gap-1.5 px-1 text-[10px] text-[#8B949E]">
                        <span>
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && (
                          <>
                            {m.delivery === 'sending' ? (
                              <Clock className="w-3 h-3 animate-spin text-[#8B949E]" />
                            ) : m.delivery === 'failed' ? (
                              <button
                                onClick={() => handleRetryOptimistic(m)}
                                className="flex items-center gap-1 text-red-400 hover:underline font-bold"
                              >
                                <AlertCircle className="w-3 h-3" /> Retry
                              </button>
                            ) : (
                              <Check className="w-3 h-3 text-emerald-400" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-[#232734] bg-[#0A0B0E]">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${partnerDetails.name}...`}
                  className="flex-1 px-4 py-2.5 bg-[#12141A] border border-[#232734] focus:border-[#FF5A1F] rounded-xl text-xs text-[#F0F3F6] placeholder-[#8B949E] outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#FF7A45] text-white disabled:opacity-40 transition font-bold text-xs flex items-center gap-2 shrink-0 shadow-md shadow-[#FF5A1F]/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[#8B949E]">
            <div className="w-12 h-12 rounded-2xl bg-[#181B22] border border-[#232734] flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-[#FF5A1F]" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Select a conversation</h4>
            <p className="max-w-xs">
              Choose an existing chat thread or start a new conversation to connect.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
