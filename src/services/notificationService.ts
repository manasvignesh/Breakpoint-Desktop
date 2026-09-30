import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { toDomainNotification } from './mappers/notificationMapper';
import type { Notification } from '../types/domain';
import type { PlatformNotificationRecord } from '../types/platform';

/**
 * Streams real-time notifications for the current authenticated user.
 */
export function subscribeToUserNotifications(
  userId: string,
  onData: (notifications: Notification[]) => void,
  onError: (err: Error) => void,
) {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const notifsQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(50),
  );

  return onSnapshot(
    notifsQuery,
    (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((docSnap) => {
        try {
          const data = docSnap.data() as PlatformNotificationRecord;
          notifications.push(toDomainNotification({ ...data, id: docSnap.id }));
        } catch (error) {
          console.warn('[NotificationService] Malformed notification ignored:', error);
        }
      });

      // Sort newest first
      notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onData(notifications);
    },
    (err) => {
      console.error('[NotificationService] Subscription error:', err);
      onError(err);
    },
  );
}

/**
 * Marks a notification as read in Firestore.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notifRef = doc(db, 'notifications', notificationId);
  await updateDoc(notifRef, { isRead: true });
}
