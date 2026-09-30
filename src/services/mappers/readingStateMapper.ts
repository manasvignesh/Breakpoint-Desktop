import type { PlatformReadingStateRecord } from '../../types/platform';
import type { ReadingState } from '../../types/domain';

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

function parseNullableDate(value: unknown): Date | null {
  if (!value) return null;
  return parseDate(value);
}

export function toDomainReadingState(
  record: PlatformReadingStateRecord,
): ReadingState {
  const rawProgress = typeof record.progress === 'number' ? record.progress : 0;
  const progress = Math.max(0.0, Math.min(1.0, rawProgress));
  const isCompleted = progress >= 0.90 || Boolean(record.lastCompletedAt);

  return {
    articleId: String(record.articleId || ''),
    firstOpenedAt: parseDate(record.firstOpenedAt),
    lastOpenedAt: parseDate(record.lastOpenedAt),
    progress,
    isCompleted,
    lastCompletedAt: parseNullableDate(record.lastCompletedAt),
    preferredLanguage: record.preferredLanguage,
    lastAudioPositionSeconds: typeof record.lastAudioPositionSeconds === 'number'
      ? Math.max(0, record.lastAudioPositionSeconds)
      : undefined,
    audioDurationSeconds: typeof record.audioDurationSeconds === 'number'
      ? Math.max(0, record.audioDurationSeconds)
      : undefined,
    lastInteractionMode: record.lastInteractionMode || 'reading',
    updatedAt: parseDate(record.updatedAt),
  };
}
