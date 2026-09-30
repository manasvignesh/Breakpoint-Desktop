import type { PlatformArticleRecord } from '../types/platform';
import type {
  PlatformStoryUpdateRecord,
  PlatformStoryChange,
  StructuredFact,
  StoryChangeType,
} from '../types/timeline';
import { extractStructuredFacts } from './structuredFactService';

/**
 * Checks if a fact's value and context was already established in preceding articles.
 */
function wasFactMentionedInHistory(
  fact: StructuredFact,
  previousArticles: PlatformArticleRecord[]
): boolean {
  const valStr = String(fact.value).toLowerCase().trim();
  const labelStr = fact.label.toLowerCase().trim();

  for (const art of previousArticles) {
    const text = [
      art.title || '',
      art.quick_brief?.headline || '',
      art.quick_brief?.quick_summary || '',
      art.full_article?.what_happened || '',
      art.full_article?.why_this_matters || '',
      art.full_article?.in_20_seconds || '',
      art.full_article?.hook || '',
      ...(art.quick_brief?.three_things_to_know || []),
      ...(art.full_article?.takeaways || []),
      art.raw_input || '',
    ].join(' ').toLowerCase();

    // Direct value match
    if (valStr.length >= 3 && text.includes(valStr)) {
      return true;
    }

    // Number match with contextual label keyword
    const numMatch = valStr.match(/\d+/);
    if (numMatch && text.includes(numMatch[0])) {
      const labelKeywords = labelStr.split(/[\s_]+/).filter(k => k.length >= 4);
      if (labelKeywords.some(k => text.includes(k))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generates an English narrative description for a detected factual delta.
 */
function formatChangeDescription(
  subjectLabel: string,
  prev: string | number | null | undefined,
  curr: string | number | null | undefined,
  category: StructuredFact['category'],
  unit?: string
): string {
  const unitStr = unit ? ` ${unit}` : '';
  if (prev !== null && prev !== undefined && curr !== null && curr !== undefined) {
    if (typeof prev === 'number' && typeof curr === 'number') {
      if (curr > prev) {
        return `${subjectLabel} increased from ${prev}${unitStr} to ${curr}${unitStr}.`;
      } else if (curr < prev) {
        return `${subjectLabel} decreased from ${prev}${unitStr} to ${curr}${unitStr}.`;
      }
    }
    return `${subjectLabel} updated from "${prev}" to "${curr}".`;
  }
  if (category === 'location') {
    return `${curr} announced as new facility location.`;
  }
  if (category === 'status') {
    return `Status updated to ${curr}.`;
  }
  return `New ${subjectLabel.toLowerCase()}: ${curr}${unitStr}.`;
}

/**
 * Compares structured facts against previous facts and historical articles,
 * classifying each change with precise semantic types and userFacing flags.
 */
export function computeFactDeltas(
  previousFacts: StructuredFact[],
  currentFacts: StructuredFact[],
  currentArticle: PlatformArticleRecord,
  previousArticles: PlatformArticleRecord[] = []
): PlatformStoryChange[] {
  const changes: PlatformStoryChange[] = [];
  const prevMap = new Map<string, StructuredFact>();
  for (const f of previousFacts) {
    prevMap.set(f.subject, f);
  }

  for (const curr of currentFacts) {
    const prev = prevMap.get(curr.subject);

    // 1. Subject previously recorded with a value
    if (prev) {
      if (String(prev.value).trim().toLowerCase() !== String(curr.value).trim().toLowerCase()) {
        const isNumeric = typeof prev.value === 'number' && typeof curr.value === 'number';
        let type: StoryChangeType = 'value_changed';
        let userFacing = true;

        if (curr.category === 'status') {
          type = 'status_changed';
        } else if (curr.category === 'location') {
          type = 'location_added';
        } else if (curr.category === 'date') {
          type = 'date_changed';
        }

        const desc = formatChangeDescription(curr.label, prev.value, curr.value, curr.category, curr.unit);

        changes.push({
          id: `chg_${currentArticle.id.slice(-6)}_${curr.subject}`,
          type,
          subject: curr.label,
          previousValue: prev.value,
          newValue: curr.value,
          description: desc,
          importance: isNumeric || curr.category === 'location' ? 4 : 3,
          userFacing,
          reason: `Property ${curr.label} shifted from "${prev.value}" to "${curr.value}".`,
          evidence: {
            articleId: currentArticle.id,
            sourceUrl: currentArticle.originalSourceUrl || undefined,
          },
        });
      }
    } else {
      // 2. Fact not in structured previousFacts
      // Check if it was already mentioned anywhere in the preceding article narratives
      const alreadyKnown = wasFactMentionedInHistory(curr, previousArticles);

      if (alreadyKnown) {
        // Known fact now surfaced with more detail -> ADDITIONAL_DETAIL (suppressed from user-facing What Changed)
        changes.push({
          id: `chg_${currentArticle.id.slice(-6)}_${curr.subject}`,
          type: 'additional_detail',
          subject: curr.label,
          previousValue: null,
          newValue: curr.value,
          description: `Supplementary detail: ${curr.label} is ${curr.value}.`,
          importance: 2,
          userFacing: false,
          reason: `Fact was already established in prior article reporting.`,
          evidence: {
            articleId: currentArticle.id,
            sourceUrl: currentArticle.originalSourceUrl || undefined,
          },
        });
      } else {
        // Genuinely new development
        let type: StoryChangeType = 'new_fact';
        let userFacing = true;
        let importance = 3;

        if (curr.category === 'location') {
          type = 'location_added';
          importance = 4;
        } else if (curr.category === 'status') {
          type = 'status_changed';
          importance = 4;
        } else if (curr.category === 'date') {
          type = 'date_changed';
        } else if (curr.category === 'partner') {
          type = 'participant_added';
        }

        const desc = formatChangeDescription(curr.label, null, curr.value, curr.category, curr.unit);

        changes.push({
          id: `chg_${currentArticle.id.slice(-6)}_${curr.subject}`,
          type,
          subject: curr.label,
          previousValue: null,
          newValue: curr.value,
          description: desc,
          importance,
          userFacing,
          reason: `Newly introduced ${curr.category} development in story progression.`,
          evidence: {
            articleId: currentArticle.id,
            sourceUrl: currentArticle.originalSourceUrl || undefined,
          },
        });
      }
    }
  }

  return changes;
}

/**
 * Computes a full PlatformStoryUpdateRecord for a new article in a story thread.
 */
export function generateStoryUpdate(
  storyId: string,
  currentArticle: PlatformArticleRecord,
  previousArticles: PlatformArticleRecord[]
): PlatformStoryUpdateRecord | null {
  // 1. Extract all historical facts from preceding articles
  const historicalFacts: StructuredFact[] = [];
  const seenHistoricalSubjects = new Set<string>();

  for (const art of previousArticles) {
    const facts = extractStructuredFacts(art);
    for (const f of facts) {
      if (!seenHistoricalSubjects.has(f.subject)) {
        seenHistoricalSubjects.add(f.subject);
        historicalFacts.push(f);
      }
    }
  }

  // 2. Extract facts from current article
  const currentFacts = extractStructuredFacts(currentArticle);

  // 3. Compute deltas with history awareness
  const changes = computeFactDeltas(historicalFacts, currentFacts, currentArticle, previousArticles);
  if (changes.length === 0) {
    return null; // Zero change
  }

  const articleTime = typeof currentArticle.publishedAt === 'string'
    ? currentArticle.publishedAt
    : (typeof currentArticle.createdAt === 'string' ? currentArticle.createdAt : new Date().toISOString());

  const ts = new Date(articleTime).getTime();

  return {
    id: `upd_${storyId.slice(-8)}_${currentArticle.id.slice(-8)}`,
    storyId,
    sourceArticleId: currentArticle.id,
    createdAt: { seconds: Math.floor(ts / 1000), nanoseconds: 0 } as any,
    changes,
  };
}
