import type {
  PlatformTimelineEventRecord,
  PlatformStoryUpdateRecord,
  PlatformStoryChange,
  StoryTimelineEvent,
  StoryUpdate,
  StoryChange,
} from '../../types/timeline';

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
 * Maps a Firestore timeline event document to domain StoryTimelineEvent.
 */
export function toDomainTimelineEvent(record: PlatformTimelineEventRecord): StoryTimelineEvent {
  return {
    id: record.id,
    storyId: record.storyId,
    occurredAt: parseDate(record.occurredAt).toISOString(),
    datePrecision: record.datePrecision || 'publication_fallback',
    title: String(record.title || '').trim(),
    summary: String(record.summary || '').trim(),
    sourceArticleIds: Array.isArray(record.sourceArticleIds) ? record.sourceArticleIds : [],
    sourceUrls: Array.isArray(record.sourceUrls) ? record.sourceUrls : undefined,
    type: record.type || 'development',
    importance: typeof record.importance === 'number' ? record.importance : 3,
    supersedesEventId: record.supersedesEventId,
    correctedByEventId: record.correctedByEventId,
    createdAt: parseDate(record.createdAt).toISOString(),
    updatedAt: parseDate(record.updatedAt).toISOString(),
  };
}

/**
 * Maps a single change object from transport to domain StoryChange.
 */
export function toDomainStoryChange(record: PlatformStoryChange): StoryChange {
  return {
    id: record.id,
    type: record.type || 'no_change',
    subject: String(record.subject || '').trim(),
    previousValue: record.previousValue ?? null,
    newValue: record.newValue ?? null,
    description: String(record.description || '').trim(),
    importance: typeof record.importance === 'number' ? record.importance : 3,
    userFacing: record.userFacing !== false,
    reason: record.reason,
    evidence: record.evidence ? {
      articleId: record.evidence.articleId,
      sourceUrl: record.evidence.sourceUrl,
    } : undefined,
  };
}

/**
 * Maps a Firestore story update record to domain StoryUpdate.
 */
export function toDomainStoryUpdate(record: PlatformStoryUpdateRecord): StoryUpdate {
  return {
    id: record.id,
    storyId: record.storyId,
    sourceArticleId: record.sourceArticleId,
    createdAt: parseDate(record.createdAt).toISOString(),
    changes: Array.isArray(record.changes) ? record.changes.map(toDomainStoryChange) : [],
  };
}
