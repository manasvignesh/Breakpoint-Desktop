import type { PlatformNotificationRecord } from '../../types/platform';
import type { Notification } from '../../types/domain';

function parseDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const ts = value as { seconds: number; nanoseconds?: number };
    return new Date(ts.seconds * 1000 + ((ts.nanoseconds || 0) / 1000000));
  }
  if (typeof value === 'number') {
    const millis = value < 100000000000 ? value * 1000 : value;
    return new Date(millis);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed) : new Date();
  }
  return new Date();
}

export function toDomainNotification(
  record: PlatformNotificationRecord,
): Notification {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title || 'Notification',
    body: record.body || '',
    type: (record.type || record.contentType || 'system').toLowerCase(),
    contentType: record.contentType,
    contentId: record.contentId || record.conversationId || null,
    conversationId: record.conversationId,
    senderId: record.senderId || record.actorId,
    actorId: record.actorId,
    actorName: record.actorName,
    actorAvatar: record.actorAvatar,
    isRead: Boolean(record.isRead),
    createdAt: parseDate(record.createdAt),
  };
}
