import type { PlatformArticleRecord } from '../types/platform';
import type {
  PlatformTimelineEventRecord,
  TimelineEventType,
  DatePrecision,
} from '../types/timeline';
import { tokenizeText } from './entityExtractionService';


export function extractDateString(dateVal: any): string | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') return dateVal;
  if (typeof dateVal === 'number') return new Date(dateVal).toISOString();
  if (typeof dateVal.toDate === 'function') {
    return dateVal.toDate().toISOString();
  }
  if (typeof dateVal.seconds === 'number') {
    return new Date(dateVal.seconds * 1000 + (dateVal.nanoseconds || 0) / 1000000).toISOString();
  }
  if (typeof dateVal._seconds === 'number') {
    return new Date(dateVal._seconds * 1000 + (dateVal._nanoseconds || 0) / 1000000).toISOString();
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toISOString();
  }
  return null;
}

/**
 * Extracts explicit event dates from text or returns fallback.
 */
export function resolveEventDate(
  textCorpus: string,
  fallbackDateStr?: string | null
): { date: Date; precision: DatePrecision } {
  const fallback = fallbackDateStr ? new Date(fallbackDateStr) : new Date();

  // 1. Explicit Day + Month: e.g. "September 27", "27 September", "Sep 18, 2026"
  const monthNames = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const dayMonthRegex = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i');
  const monthDayRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:,?\\s+(\\d{4}))?\\b`, 'i');

  const match1 = textCorpus.match(dayMonthRegex);
  if (match1) {
    const monthStr = match1[1];
    const day = parseInt(match1[2], 10);
    const year = match1[3] ? parseInt(match1[3], 10) : fallback.getFullYear();
    const parsed = new Date(`${monthStr} ${day}, ${year} UTC`);
    if (!isNaN(parsed.getTime())) {
      return { date: parsed, precision: 'exact_day' };
    }
  }

  const match2 = textCorpus.match(monthDayRegex);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const monthStr = match2[2];
    const year = match2[3] ? parseInt(match2[3], 10) : fallback.getFullYear();
    const parsed = new Date(`${monthStr} ${day}, ${year} UTC`);
    if (!isNaN(parsed.getTime())) {
      return { date: parsed, precision: 'exact_day' };
    }
  }

  // 2. Month + Year only: e.g. "in November 2026", "in October"
  const monthYearRegex = new RegExp(`\\b(?:in|by|from)\\s+(${monthNames})(?:\\s+(\\d{4}))?\\b`, 'i');
  const matchMonth = textCorpus.match(monthYearRegex);
  if (matchMonth) {
    const monthStr = matchMonth[1];
    const year = matchMonth[2] ? parseInt(matchMonth[2], 10) : fallback.getFullYear();
    const parsed = new Date(`${monthStr} 1, ${year} UTC`);
    if (!isNaN(parsed.getTime())) {
      return { date: parsed, precision: 'month' };
    }
  }

  // 3. Fallback to article publication date
  return {
    date: fallback,
    precision: 'publication_fallback',
  };
}

/**
 * Classifies the timeline event type based on text semantics.
 */
export function classifyEventType(text: string): TimelineEventType {
  const lower = text.toLowerCase();
  if (/\b(correction|clarified|revised|retracted)\b/i.test(lower)) return 'correction';
  if (/\b(launched|unveiled|rolled out|released|deployed)\b/i.test(lower)) return 'launch';
  if (/\b(invested|raised|series|funding|capital|crore|million|billion|valuation)\b/i.test(lower)) return 'financial';
  if (/\b(approved|sanctioned|policy|regulation|court|ruling|ban|compliance|ministry)\b/i.test(lower)) return 'regulatory';
  if (/\b(announced|unveils|revealed|declared|signed|partnership|agreed)\b/i.test(lower)) return 'announcement';
  if (/\b(expanded|construction|doubles|growing|hiring|milestone|tested)\b/i.test(lower)) return 'development';
  if (/\b(updated|amended|next step|phase 2|progress)\b/i.test(lower)) return 'update';
  return 'other';
}

/**
 * Extracts a primary timeline event representation from an article.
 */
export function extractArticleTimelineEvent(
  article: PlatformArticleRecord,
  storyId: string
): PlatformTimelineEventRecord {
  const articleId = article.id;
  const publishedAtStr = extractDateString(article.publishedAt)
    || extractDateString(article.createdAt)
    || new Date().toISOString();

  const title = article.title || article.quick_brief?.headline || article.full_article?.headline || 'Story Update';
  const summary = article.quick_brief?.quick_summary
    || article.full_article?.in_20_seconds
    || article.full_article?.hook
    || '';

  const fullText = `${title}. ${summary}. ${article.full_article?.what_happened || ''}`;
  const { date, precision } = resolveEventDate(fullText, publishedAtStr);
  const type = classifyEventType(fullText);

  const sourceUrls = article.originalSourceUrl ? [article.originalSourceUrl] : [];

  // Deterministic event ID based on storyId and articleId
  const eventId = `ev_${storyId.slice(-8)}_${articleId.slice(-8)}`;

  return {
    id: eventId,
    storyId,
    occurredAt: { seconds: Math.floor(date.getTime() / 1000), nanoseconds: (date.getTime() % 1000) * 1000000 } as any,
    datePrecision: precision,
    title,
    summary,
    sourceArticleIds: [articleId],
    sourceUrls: sourceUrls,
    type,
    importance: article.isFeatured ? 5 : (article.isTodaysDrop ? 4 : 3),
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
  };
}

/**
 * Computes lexical & entity similarity between two timeline events to prevent duplication.
 */
function areEventsDuplicate(a: PlatformTimelineEventRecord, b: PlatformTimelineEventRecord): boolean {
  // Check temporal distance (within 3 days)
  const aSec = (a.occurredAt as any)?.seconds || 0;
  const bSec = (b.occurredAt as any)?.seconds || 0;
  const diffDays = Math.abs(aSec - bSec) / (3600 * 24);
  if (diffDays > 3) return false;

  // Title token overlap
  const tokensTitleA = new Set(tokenizeText(a.title));
  const tokensTitleB = new Set(tokenizeText(b.title));
  let titleInter = 0;
  for (const t of tokensTitleA) {
    if (tokensTitleB.has(t)) titleInter++;
  }
  const titleOverlap = (2 * titleInter) / (tokensTitleA.size + tokensTitleB.size || 1);

  // Full token overlap
  const tokensA = new Set(tokenizeText(`${a.title} ${a.summary}`));
  const tokensB = new Set(tokenizeText(`${b.title} ${b.summary}`));
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const overlap = (2 * intersection) / (tokensA.size + tokensB.size || 1);

  // If title overlap >= 0.35 OR total overlap >= 0.45 OR (same event type and title overlap >= 0.28)
  if (titleOverlap >= 0.35 || overlap >= 0.45 || (a.type === b.type && titleOverlap >= 0.28)) {
    return true;
  }

  return false;
}

/**
 * Merges a newly extracted event into an existing timeline, performing deduplication and correction linking.
 */
export function mergeTimelineEvent(
  existingTimeline: PlatformTimelineEventRecord[],
  newEvent: PlatformTimelineEventRecord
): PlatformTimelineEventRecord[] {
  const result = [...existingTimeline];

  // 1. Check for duplicate event (unless this is explicitly a correction)
  const duplicateIdx = newEvent.type === 'correction'
    ? -1
    : result.findIndex(ev => areEventsDuplicate(ev, newEvent));
  if (duplicateIdx !== -1) {
    const existing = result[duplicateIdx];
    // Attach sourceArticleIds
    const mergedSourceIds = Array.from(new Set([...existing.sourceArticleIds, ...newEvent.sourceArticleIds]));
    const mergedSourceUrls = Array.from(new Set([
      ...(existing.sourceUrls || []),
      ...(newEvent.sourceUrls || []),
    ]));

    result[duplicateIdx] = {
      ...existing,
      sourceArticleIds: mergedSourceIds,
      sourceUrls: mergedSourceUrls.length > 0 ? mergedSourceUrls : undefined,
      importance: Math.max(existing.importance, newEvent.importance),
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    };
    return result;
  }

  // 2. Check if this is a correction of an earlier event
  if (newEvent.type === 'correction') {
    const tokensNew = new Set(tokenizeText(newEvent.title + ' ' + newEvent.summary));
    // Find most relevant earlier event
    let targetIdx = -1;
    let maxOverlap = 0;
    for (let i = 0; i < result.length; i++) {
      const tokensOld = new Set(tokenizeText(result[i].title + ' ' + result[i].summary));
      let inter = 0;
      for (const t of tokensNew) {
        if (tokensOld.has(t)) inter++;
      }
      const overlap = inter / Math.min(tokensNew.size, tokensOld.size || 1);
      if (overlap > 0.40 && overlap > maxOverlap) {
        maxOverlap = overlap;
        targetIdx = i;
      }
    }

    if (targetIdx !== -1) {
      const target = result[targetIdx];
      newEvent.supersedesEventId = target.id;
      result[targetIdx] = {
        ...target,
        correctedByEventId: newEvent.id,
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
      };
    }
  }

  result.push(newEvent);
  // Sort chronologically by occurredAt seconds
  result.sort((a, b) => {
    const aSec = (a.occurredAt as any)?.seconds || 0;
    const bSec = (b.occurredAt as any)?.seconds || 0;
    return aSec - bSec;
  });

  return result;
}
