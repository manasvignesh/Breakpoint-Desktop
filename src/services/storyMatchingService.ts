import type { Story, StoryThread, StoryMatchCandidate, StoryMatchResult } from '../types/domain';
import {
  extractEntities,
  detectEventPredicate,
  calculateEntityJaccard,
  tokenizeText,
} from './entityExtractionService';

/**
 * Generates a stable canonical story identifier (e.g. "st_01j8k9abc123").
 */
export function generateStoryId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  const timestamp = Date.now().toString(36);
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `st_${timestamp}_${randomPart}`;
}

/**
 * Generates an SEO-friendly, URL-safe slug from a title string.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/**
 * Calculates token-level Dice coefficient overlap between two text strings.
 */
export function calculateTokenOverlap(textA: string, textB: string): number {
  const tokensA = new Set(tokenizeText(textA));
  const tokensB = new Set(tokenizeText(textB));
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionCount++;
  }

  return (2.0 * intersectionCount) / (tokensA.size + tokensB.size);
}

/**
 * Calculates bi-gram overlap between two text strings for higher-order phrase matching.
 */
export function calculateBigramOverlap(textA: string, textB: string): number {
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);
  if (tokensA.length < 2 || tokensB.length < 2) return calculateTokenOverlap(textA, textB);

  const bigramsA = new Set<string>();
  for (let i = 0; i < tokensA.length - 1; i++) {
    bigramsA.add(`${tokensA[i]}_${tokensA[i + 1]}`);
  }

  const bigramsB = new Set<string>();
  for (let i = 0; i < tokensB.length - 1; i++) {
    bigramsB.add(`${tokensB[i]}_${tokensB[i + 1]}`);
  }

  let intersectionCount = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersectionCount++;
  }

  return (2.0 * intersectionCount) / (bigramsA.size + bigramsB.size);
}

export interface MatchingOptions {
  autoAttachThreshold?: number; // Default: 0.75 (Calibrated on production content)
  reviewThreshold?: number;     // Default: 0.60
  maxCandidateAgeDays?: number; // Default: 90
  shadowMode?: boolean;         // Default: false
}

const DEFAULT_OPTIONS: Required<MatchingOptions> = {
  autoAttachThreshold: 0.75,
  reviewThreshold: 0.60,
  maxCandidateAgeDays: 90,
  shadowMode: false,
};

/**
 * Core Hybrid Story Matcher.
 * Matches an article against candidate stories using multi-signal scoring and strict non-merge constraints.
 */
export function matchArticleToStory(
  article: Story | { id: string; title: string; category: string; summary?: string; publishedAt?: Date | null },
  existingStories: StoryThread[],
  options?: MatchingOptions,
): StoryMatchResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const articleHeadline = article.title;
  const articleSummary = ('quickBrief' in article ? article.quickBrief?.quickSummary : article.summary) || '';
  const articleCategory = article.category;
  const articlePublishedAt = article.publishedAt || new Date();

  // Extract article features
  const fullText = `${articleHeadline} ${articleSummary}`;
  const extractedEntities = extractEntities(fullText);
  const articleEntityIds = extractedEntities.map((e) => e.id);
  const articleEvent = detectEventPredicate(fullText);

  // Stage A: Deterministic Candidate Retrieval
  const now = Date.now();
  const maxAgeMs = opts.maxCandidateAgeDays * 24 * 60 * 60 * 1000;

  const candidateStories = existingStories.filter((story) => {
    // 1. Check age window
    const storyAgeMs = Math.abs(now - story.lastUpdatedAt.getTime());
    const isWithinAge = storyAgeMs <= maxAgeMs;

    // 2. Check entity overlap or primary topic
    const hasSharedEntity = story.entityIds.some((id) => articleEntityIds.includes(id));
    const sameTopic = story.primaryTopic.toLowerCase() === articleCategory.toLowerCase();

    return (isWithinAge && (hasSharedEntity || sameTopic)) || hasSharedEntity;
  });

  if (candidateStories.length === 0) {
    return {
      action: 'CREATE',
      proposedNewStory: {
        title: articleHeadline,
        summary: articleSummary || articleHeadline,
        primaryTopic: articleCategory,
        entityIds: articleEntityIds,
      },
    };
  }

  // Stage B: Multi-Signal Scoring across candidates
  let bestCandidate: StoryMatchCandidate | null = null;

  for (const story of candidateStories) {
    // Signal 1: Entity Jaccard Similarity
    const entityScore = calculateEntityJaccard(articleEntityIds, story.entityIds);
    const sharedEntities = story.entityIds.filter((id) => articleEntityIds.includes(id));

    // Signal 2: Headline Token & Bigram Overlap
    const tokenOverlap = calculateTokenOverlap(articleHeadline, story.title);
    const bigramOverlap = calculateBigramOverlap(articleHeadline, story.title);
    const headlineScore = 0.5 * tokenOverlap + 0.5 * bigramOverlap;

    // Signal 3: Event Predicate Alignment
    const storyEvent = detectEventPredicate(`${story.title} ${story.summary}`);
    let eventScore = 0.5;
    if (articleEvent === storyEvent && articleEvent !== 'general_development') {
      eventScore = 1.0;
    } else if (articleEvent !== storyEvent && articleEvent !== 'general_development' && storyEvent !== 'general_development') {
      // Conflicting distinct event types (e.g. funding vs legal dispute)
      eventScore = 0.1;
    }

    // Signal 4: Temporal Decay
    const diffDays = Math.abs(articlePublishedAt.getTime() - story.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
    const temporalDecay = Math.max(0.6, Math.exp(-diffDays / 60));

    // Weighted Confidence Calculation
    let confidence = (
      0.35 * entityScore +
      0.35 * headlineScore +
      0.20 * eventScore +
      0.10 * temporalDecay
    );

    // NON-MERGE SAFEGUARDS (Strict Domain Constraints)
    // Constraint A: Shared entity but low headline token alignment (< 0.20) - e.g. different products launched by same company
    if (sharedEntities.length >= 1 && headlineScore < 0.20) {
      confidence = Math.min(confidence, 0.45); // Strictly suppress to separate story
    } else if (sharedEntities.length === 1 && headlineScore < 0.25 && eventScore < 0.8) {
      confidence = Math.min(confidence, 0.45);
    }

    // Constraint B: If no shared entities at all and headline overlap is moderate, do not auto-attach
    if (sharedEntities.length === 0 && headlineScore < 0.60) {
      confidence = Math.min(confidence, 0.50);
    }

    // Determine Decision
    let decision: StoryMatchCandidate['decision'] = 'CREATE_NEW';
    let reason = 'Low overall similarity across entity and event signals.';

    if (confidence >= opts.autoAttachThreshold) {
      decision = 'AUTO_ATTACH';
      reason = `High confidence (${confidence.toFixed(2)}) matching on entities [${sharedEntities.join(', ')}] and headline overlap (${headlineScore.toFixed(2)}).`;
    } else if (confidence >= opts.reviewThreshold) {
      decision = 'REVIEW_OR_SPLIT';
      reason = `Moderate similarity (${confidence.toFixed(2)}). Shared entities [${sharedEntities.join(', ')}], but distinct event scope requires review.`;
    }

    const candidate: StoryMatchCandidate = {
      story,
      confidence: Math.round(confidence * 100) / 100,
      decision,
      signals: {
        entityScore: Math.round(entityScore * 100) / 100,
        headlineScore: Math.round(headlineScore * 100) / 100,
        eventScore: Math.round(eventScore * 100) / 100,
        temporalDecay: Math.round(temporalDecay * 100) / 100,
        sharedEntities,
      },
      reason,
    };

    if (!bestCandidate || candidate.confidence > bestCandidate.confidence) {
      bestCandidate = candidate;
    }
  }

  // Stage C: Final Resolution
  if (bestCandidate && bestCandidate.decision === 'AUTO_ATTACH') {
    return {
      action: 'ATTACH',
      targetStoryId: bestCandidate.story.id,
      candidate: bestCandidate,
    };
  }

  // If in review or low confidence, default to CREATE to prevent false merges
  return {
    action: 'CREATE',
    targetStoryId: undefined,
    candidate: bestCandidate || undefined,
    proposedNewStory: {
      title: articleHeadline,
      summary: articleSummary || articleHeadline,
      primaryTopic: articleCategory,
      entityIds: articleEntityIds,
    },
  };
}
