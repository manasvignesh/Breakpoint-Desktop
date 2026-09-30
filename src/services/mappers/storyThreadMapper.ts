import type { PlatformStoryRecord } from '../../types/platform';
import type { StoryThread } from '../../types/domain';

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

/**
 * Maps a Firestore/Platform Story document to a clean domain StoryThread.
 */
export function toDomainStoryThread(record: PlatformStoryRecord): StoryThread {
  const articleIds = Array.isArray(record.articleIds) ? record.articleIds : [];
  return {
    id: record.storyId,
    title: String(record.title || '').trim(),
    slug: String(record.slug || '').trim(),
    summary: String(record.summary || '').trim(),
    primaryTopic: String(record.primaryTopic || 'General').trim(),
    status: record.status || 'developing',
    entityIds: Array.isArray(record.entityIds) ? record.entityIds : [],
    articleIds,
    latestArticleId: String(record.latestArticleId || articleIds[articleIds.length - 1] || '').trim(),
    articleCount: articleIds.length,
    firstPublishedAt: parseDate(record.firstPublishedAt),
    lastUpdatedAt: parseDate(record.lastUpdatedAt),
    createdAt: parseDate(record.createdAt),
    updatedAt: parseDate(record.updatedAt),
    heroImage: record.heroImage || null,
    importance: typeof record.importance === 'number' ? record.importance : 50,
    region: record.region || 'India',
  };
}

/**
 * Maps a domain StoryThread back to a Platform Story Record for Firestore.
 */
export function toPlatformStoryRecord(thread: StoryThread): PlatformStoryRecord {
  return {
    storyId: thread.id,
    title: thread.title,
    slug: thread.slug,
    summary: thread.summary,
    primaryTopic: thread.primaryTopic,
    status: thread.status,
    entityIds: thread.entityIds,
    articleIds: thread.articleIds,
    latestArticleId: thread.latestArticleId,
    firstPublishedAt: thread.firstPublishedAt,
    lastUpdatedAt: thread.lastUpdatedAt,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    heroImage: thread.heroImage,
    importance: thread.importance,
    region: thread.region,
  };
}
