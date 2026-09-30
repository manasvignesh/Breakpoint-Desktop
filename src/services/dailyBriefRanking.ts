/**
 * Breakpoint Daily Brief Shared Pure Ranking Engine
 * Platform Phase 16F.6
 *
 * Deterministic, zero-LLM ranking engine with:
 * - Strict story deduplication (1 item per story thread)
 * - Consumed story suppression
 * - Continuing story delta prioritization
 * - Truthful primary reason codes + selection signals for outside bubble
 * - Knowledge trail grounding strictly tied to selected stories
 * - Quality threshold enforcement (target, not quota)
 * - Stable, position-independent item IDs
 *
 * Pure TypeScript module: Zero Node, Deno, or Firebase dependencies.
 */

export type DailyBriefReasonCode =
  | "important"
  | "followed"
  | "continuing"
  | "interest"
  | "knowledge_gap";

export type DailyBriefItemType =
  | "story"
  | "story_update"
  | "article"
  | "knowledge"
  | "trail";

export type BriefExplanationMode =
  | "standard"
  | "compact_delta"
  | "primer"
  | "deep_dive";

export type StoryChangeType =
  | "value_changed"
  | "new_fact"
  | "additional_detail"
  | "status_changed"
  | "location_added"
  | "location_removed"
  | "date_changed"
  | "participant_added"
  | "correction"
  | "no_change";

export interface MaterialChangeDetail {
  id?: string;
  changeType: StoryChangeType;
  subject: string;
  description: string;
  summary?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  timestamp?: string;
  userFacing?: boolean;
}

export interface DailyBriefCandidate {
  id: string;
  type: DailyBriefItemType;
  storyId?: string;
  articleId?: string;
  trailId?: string;
  conceptId?: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  editorialImportance: number;
  entityIds: string[];
  conceptIds: string[];
  topicTags: string[];
  readTimeMinutes: number;
  materialChangesCount?: number;
  deltas?: MaterialChangeDetail[];
  imageUrl?: string;
}

export interface ScoreDecomposition {
  editorialImportanceScore: number;
  freshnessScore: number;
  continuingDeltaScore: number;
  followScore: number;
  interestScore: number;
  knowledgeScore: number;
  totalScore: number;
}

export interface DailyBriefItem {
  id: string;
  briefId: string;
  orderIndex: number;
  type: DailyBriefItemType;
  reasonCode: DailyBriefReasonCode;
  reasonExplanation: string;
  selectionSignals?: string[];
  isOutsideBubble?: boolean;
  storyId?: string;
  articleId?: string;
  trailId?: string;
  conceptId?: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  readTimeMinutes: number;
  explanationMode: BriefExplanationMode;
  deltaSummary?: string;
  sinceYouLastReadDeltas?: string[];
  score: number;
  scoreDecomposition?: ScoreDecomposition;
  imageUrl?: string;
  isCompleted?: boolean;
}

export interface UserRankingContext {
  userId: string;
  followedEntityIds: Set<string>;
  followedTopics: Set<string>;
  readingHistory: Map<string, { progress: number; lastReadAt: number }>;
  storyReadHistory: Map<string, { lastReadArticleId: string; lastReadAt: number; maxProgress: number }>;
  knowledgeFamiliarity: Map<string, string>; // conceptId -> 'unseen' | 'exposed' | 'familiar' | 'understood'
  activeTrailIds: Set<string>;
  completedTrailIds: Set<string>;
}

export interface RankingOptions {
  briefId: string;
  minItems?: number;
  maxItems?: number;
  qualityThreshold?: number;
}

const VALID_MATERIAL_CHANGE_TYPES: Set<StoryChangeType> = new Set([
  "value_changed",
  "new_fact",
  "status_changed",
  "location_added",
  "location_removed",
  "date_changed",
  "participant_added",
  "correction",
]);

/**
 * Validates whether a factual story change is strictly user-facing and material.
 * Rejects missing fields, 'additional_detail', 'other', 'no_change', and permissive defaults.
 */
export function isMaterialUserFacingChange(change: any): boolean {
  if (!change || typeof change !== "object") return false;
  // Strict boolean check: MUST be strictly true (not undefined or truthy string)
  if (change.userFacing !== true) return false;
  if (typeof change.type !== "string") return false;
  const changeType = change.type.trim() as StoryChangeType;
  return VALID_MATERIAL_CHANGE_TYPES.has(changeType);
}

/**
 * Deterministic suppression check.
 */
export function isCandidateSuppressed(cand: DailyBriefCandidate, ctx: UserRankingContext): boolean {
  // 1. Trail completed check
  if (cand.trailId && ctx.completedTrailIds.has(cand.trailId)) {
    return true;
  }

  // 2. Consumed story suppression (direct article)
  if (cand.articleId) {
    const artHistory = ctx.readingHistory.get(cand.articleId);
    if (artHistory && artHistory.progress >= 0.90) {
      if (!cand.materialChangesCount || cand.materialChangesCount === 0) {
        return true; // Read without material changes -> SUPPRESS
      }
    }
  }

  // 3. Consumed story thread suppression
  if (cand.storyId) {
    const storyHist = ctx.storyReadHistory.get(cand.storyId);
    if (storyHist && storyHist.maxProgress >= 0.90) {
      if (!cand.materialChangesCount || cand.materialChangesCount === 0) {
        return true; // Read story thread without new material facts -> SUPPRESS
      }
    }
  }

  return false;
}

/**
 * Calculates deterministic scoring decomposition and reason code for a candidate.
 */
export function scoreCandidate(
  cand: DailyBriefCandidate,
  ctx: UserRankingContext
): {
  candidate: DailyBriefCandidate;
  score: number;
  reasonCode: DailyBriefReasonCode;
  reasonExplanation: string;
  explanationMode: BriefExplanationMode;
  deltas: string[];
  decomposition: ScoreDecomposition;
} {
  let editorialImportanceScore = 0.0;
  let freshnessScore = 0.0;
  let continuingDeltaScore = 0.0;
  let followScore = 0.0;
  let interestScore = 0.0;
  let knowledgeScore = 0.0;

  let reasonCode: DailyBriefReasonCode = "important";
  let reasonExplanation = "Key editorial development today";

  // 1. Editorial Importance (Weight: 0.30)
  const editorialImportance = typeof cand.editorialImportance === "number" ? cand.editorialImportance : 0.5;
  editorialImportanceScore = editorialImportance * 0.30;

  // 2. Freshness Decay (Weight: 0.20)
  const publishedTime = new Date(cand.publishedAt).getTime();
  const now = Date.now();
  const ageHours = Math.max(0, (now - publishedTime) / (1000 * 60 * 60));
  let freshnessWeight = 0.40;
  if (ageHours <= 6) freshnessWeight = 1.0;
  else if (ageHours <= 12) freshnessWeight = 0.85;
  else if (ageHours <= 24) freshnessWeight = 0.70;
  else if (ageHours <= 48) freshnessWeight = 0.40;
  else freshnessWeight = 0.15;
  freshnessScore = freshnessWeight * 0.20;

  // 3. Continuing Story Delta Value (Weight: 0.35 boost)
  let isContinuing = false;
  const materialDeltas: string[] = [];

  if (cand.storyId) {
    const storyHist = ctx.storyReadHistory.get(cand.storyId);
    if (storyHist && (storyHist.maxProgress > 0.20 || storyHist.lastReadAt > 0)) {
      if ((cand.materialChangesCount || 0) > 0) {
        isContinuing = true;
        continuingDeltaScore = 0.35;
        reasonCode = "continuing";
        reasonExplanation = `New developments in story you're following (${cand.materialChangesCount} new updates)`;
        if (cand.deltas) {
          const userLastReadTime = storyHist.lastReadAt ? new Date(storyHist.lastReadAt).getTime() : 0;
          cand.deltas.forEach((d) => {
            const deltaPublishedTime = d.timestamp ? new Date(d.timestamp).getTime() : Infinity;
            if (!d.timestamp || deltaPublishedTime > userLastReadTime) {
              if (d.description || d.summary) {
                materialDeltas.push(d.description || d.summary || "");
              }
            }
          });
        }
      }
    }
  }

  // 4. Followed Entities & Topics
  const hasFollowedEntity = cand.entityIds.some((e) => ctx.followedEntityIds.has(e));
  const hasFollowedTopic =
    cand.topicTags.some((t) => ctx.followedTopics.has(t)) ||
    ctx.followedTopics.has(cand.category.toLowerCase());

  if (hasFollowedEntity) {
    followScore = 0.25;
    if (!isContinuing) {
      reasonCode = "followed";
      reasonExplanation = "Followed entity in the news";
    }
  } else if (hasFollowedTopic) {
    interestScore = 0.15;
    if (!isContinuing && reasonCode === "important") {
      reasonCode = "interest";
      reasonExplanation = `Matches your interest in ${cand.category}`;
    }
  }

  // 5. Knowledge Gap / Trail Explanation Mode
  let explanationMode: BriefExplanationMode = "standard";
  if (cand.type === "trail") {
    knowledgeScore = 0.20;
    reasonCode = "knowledge_gap";
    reasonExplanation = "Recommended concept pathway";
    explanationMode = "primer";
  } else if (cand.conceptIds && cand.conceptIds.length > 0) {
    const states = cand.conceptIds.map((cId) => ctx.knowledgeFamiliarity.get(cId) || "unseen");
    const hasUnseen = states.includes("unseen") || states.includes("exposed");
    const allFamiliar = states.every((s) => s === "familiar" || s === "understood");

    if (hasUnseen) {
      knowledgeScore = 0.10;
      explanationMode = "primer";
    } else if (allFamiliar) {
      explanationMode = "deep_dive";
    }
  }

  if (isContinuing && materialDeltas.length > 0) {
    explanationMode = "compact_delta";
  }

  const totalScore = Math.round(
    (editorialImportanceScore + freshnessScore + continuingDeltaScore + followScore + interestScore + knowledgeScore) * 100
  ) / 100;

  return {
    candidate: cand,
    score: totalScore,
    reasonCode,
    reasonExplanation,
    explanationMode,
    deltas: materialDeltas,
    decomposition: {
      editorialImportanceScore: Math.round(editorialImportanceScore * 100) / 100,
      freshnessScore: Math.round(freshnessScore * 100) / 100,
      continuingDeltaScore: Math.round(continuingDeltaScore * 100) / 100,
      followScore: Math.round(followScore * 100) / 100,
      interestScore: Math.round(interestScore * 100) / 100,
      knowledgeScore: Math.round(knowledgeScore * 100) / 100,
      totalScore,
    },
  };
}

/**
 * Main Pure Ranking Engine.
 * Takes candidate pool and user context, returns ordered DailyBriefItem list.
 */
export function rankBrief(
  candidates: DailyBriefCandidate[],
  userContext: UserRankingContext,
  options: RankingOptions,
  availableTrails: DailyBriefCandidate[] = []
): DailyBriefItem[] {
  const minItems = options.minItems || 5;
  const maxItems = options.maxItems || 8;
  const qualityThreshold = options.qualityThreshold !== undefined ? options.qualityThreshold : 0.35;
  const briefId = options.briefId;

  // 1. Separate news candidates from standalone trails
  const newsCandidates = candidates.filter((c) => c.type !== "trail");
  const trailPool = [...availableTrails, ...candidates.filter((c) => c.type === "trail")];

  // 2. Score news candidates
  interface ScoredCandidate {
    candidate: DailyBriefCandidate;
    score: number;
    reasonCode: DailyBriefReasonCode;
    reasonExplanation: string;
    explanationMode: BriefExplanationMode;
    deltas: string[];
    decomposition: ScoreDecomposition;
    selectionSignals?: string[];
  }

  const scoredList: ScoredCandidate[] = [];

  for (const cand of newsCandidates) {
    if (isCandidateSuppressed(cand, userContext)) {
      continue;
    }

    const scored = scoreCandidate(cand, userContext);
    if (scored.score >= qualityThreshold) {
      scoredList.push(scored);
    }
  }

  // Sort by raw personal score descending
  scoredList.sort((a, b) => b.score - a.score);

  // 3. Selection with Story Deduplication and Category Diversity
  const selected: ScoredCandidate[] = [];
  const seenStoryIds = new Set<string>();
  const categoryCounts = new Map<string, number>();

  // Identify candidates for outside bubble (non-followed topics and entities, high importance)
  const outsideBubbleCandidates = scoredList.filter((sc) => {
    const isFollowed =
      sc.candidate.entityIds.some((e) => userContext.followedEntityIds.has(e)) ||
      sc.candidate.topicTags.some((t) => userContext.followedTopics.has(t)) ||
      userContext.followedTopics.has(sc.candidate.category.toLowerCase());
    return !isFollowed && sc.score >= qualityThreshold;
  });

  for (const item of scoredList) {
    if (selected.length >= maxItems) break;

    // Deduplicate story threads
    if (item.candidate.storyId) {
      if (seenStoryIds.has(item.candidate.storyId)) continue;
    }

    // Category diversity soft penalty
    const currentCatCount = categoryCounts.get(item.candidate.category) || 0;
    if (currentCatCount >= 2 && selected.length < maxItems - 1) {
      continue;
    }

    selected.push(item);
    if (item.candidate.storyId) seenStoryIds.add(item.candidate.storyId);
    categoryCounts.set(item.candidate.category, currentCatCount + 1);
  }

  // Backfill non-duplicate items only if they clear the quality threshold
  if (selected.length < minItems) {
    for (const item of scoredList) {
      if (selected.length >= maxItems) break;
      if (selected.some((s) => s.candidate.id === item.candidate.id)) continue;
      if (item.candidate.storyId && seenStoryIds.has(item.candidate.storyId)) continue;

      selected.push(item);
      if (item.candidate.storyId) seenStoryIds.add(item.candidate.storyId);
    }
  }

  // 4. Outside Bubble Diversity Signal (Requirement 11: Retain truthful reasonCode, add signal)
  if (selected.length >= 4 && !selected.some((s) => s.selectionSignals?.includes("outside_bubble"))) {
    const existingOutside = selected.find((s) =>
      s.reasonCode === "important" &&
      outsideBubbleCandidates.some((ob) => ob.candidate.id === s.candidate.id)
    );

    if (existingOutside) {
      existingOutside.selectionSignals = ["outside_bubble"];
    } else {
      const bestOutside = outsideBubbleCandidates.find(
        (ob) => !selected.some((s) => s.candidate.id === ob.candidate.id) &&
          (!ob.candidate.storyId || !seenStoryIds.has(ob.candidate.storyId))
      );

      if (bestOutside) {
        const lastSelected = selected[selected.length - 1];
        if (selected.length < maxItems) {
          bestOutside.selectionSignals = ["outside_bubble"];
          selected.push(bestOutside);
        } else if (lastSelected && lastSelected.reasonCode === "important" && lastSelected.score - bestOutside.score <= 0.15) {
          bestOutside.selectionSignals = ["outside_bubble"];
          selected[selected.length - 1] = bestOutside;
        }
      }
    }
  }

  // 5. Grounded Knowledge Trail Injection (Requirement 12: Grounded strictly in SELECTED stories)
  if (selected.length < maxItems && trailPool.length > 0) {
    // Collect all concepts referenced by selected news items
    const selectedConcepts = new Set<string>();
    selected.forEach((s) => s.candidate.conceptIds.forEach((cId) => selectedConcepts.add(cId)));

    if (selectedConcepts.size > 0) {
      // Find eligible trail tied to selected concepts where user has a gap
      for (const trailCand of trailPool) {
        if (isCandidateSuppressed(trailCand, userContext)) continue;
        const trailConcepts = trailCand.conceptIds || [];
        const matchesSelected = trailConcepts.some((cId) => selectedConcepts.has(cId));
        const hasKnowledgeGap = trailConcepts.some((cId) => {
          const state = userContext.knowledgeFamiliarity.get(cId) || "unseen";
          return state === "unseen" || state === "exposed";
        });

        if (matchesSelected && hasKnowledgeGap) {
          const scoredTrail = scoreCandidate(trailCand, userContext);
          if (scoredTrail.score >= qualityThreshold) {
            selected.push(scoredTrail);
            break; // At most ONE knowledge trail per brief
          }
        }
      }
    }
  }

  // 6. Construct Stable Item IDs and Final Item Objects
  return selected.map((sc, index) => {
    const cand = sc.candidate;
    const isStoryUpdate = sc.reasonCode === "continuing" && (cand.materialChangesCount || 0) > 0;
    const itemType = isStoryUpdate ? "story_update" : cand.type;
    const canonicalRef = cand.storyId || cand.articleId || cand.trailId || cand.id;
    // Stable ID derived from briefId, itemType, and canonicalRef
    const stableId = `${briefId}_${itemType}_${canonicalRef}`;

    return {
      id: stableId,
      briefId,
      orderIndex: index,
      type: itemType,
      reasonCode: sc.reasonCode,
      reasonExplanation: sc.reasonExplanation,
      selectionSignals: sc.selectionSignals,
      isOutsideBubble: sc.selectionSignals?.includes("outside_bubble"),
      storyId: cand.storyId,
      articleId: cand.articleId,
      trailId: cand.trailId,
      conceptId: cand.conceptId,
      title: cand.title,
      summary: cand.summary,
      category: cand.category,
      publishedAt: cand.publishedAt,
      readTimeMinutes: cand.readTimeMinutes || 2,
      explanationMode: sc.explanationMode,
      deltaSummary: cand.deltas && cand.deltas.length > 0 ? (cand.deltas[0].description || cand.deltas[0].summary) : undefined,
      sinceYouLastReadDeltas: sc.deltas && sc.deltas.length > 0 ? sc.deltas : undefined,
      score: sc.score,
      scoreDecomposition: sc.decomposition,
      imageUrl: cand.imageUrl,
      isCompleted: false,
    };
  });
}

/**
 * Pure helper to resolve the index of the first unhandled (neither completed nor skipped) item.
 */
export function resolveNextUnresolvedIndex(
  items: Array<{ id: string }>,
  completedIds: Set<string> | string[],
  skippedIds: Set<string> | string[]
): number {
  const completedSet = completedIds instanceof Set ? completedIds : new Set(completedIds);
  const skippedSet = skippedIds instanceof Set ? skippedIds : new Set(skippedIds);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!completedSet.has(item.id) && !skippedSet.has(item.id)) {
      return i;
    }
  }
  return Math.max(0, items.length - 1);
}
