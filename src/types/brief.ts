/**
 * Breakpoint Daily Brief & Finite Personalized Discovery Types
 * Platform Phase 16F
 */

import { UserKnowledgeState } from './knowledge';

export type DailyBriefReasonCode =
  | 'important'
  | 'followed'
  | 'continuing'
  | 'interest'
  | 'knowledge_gap'
  | 'outside_bubble';

export type DailyBriefItemType =
  | 'story'
  | 'story_update'
  | 'article'
  | 'knowledge'
  | 'trail';

export type BriefExplanationMode =
  | 'standard'
  | 'compact_delta'
  | 'primer'
  | 'deep_dive';

export interface DailyBriefDeltaDetail {
  changeType: string;
  summary: string;
  oldValue?: string;
  newValue?: string;
  timestamp?: string;
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
  editorialImportance: number; // 0.0 - 1.0
  entityIds: string[];
  conceptIds: string[];
  topicTags: string[];
  readTimeMinutes: number;
  latestChangeSummary?: string;
  changesCount?: number;
  materialChangesCount?: number;
  deltas?: DailyBriefDeltaDetail[];
  imageUrl?: string;
}

export interface DailyBriefItem {
  id: string;
  briefId: string;
  orderIndex: number;
  type: DailyBriefItemType;
  reasonCode: DailyBriefReasonCode;
  reasonExplanation: string;
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
  imageUrl?: string;
  isCompleted?: boolean;
  selectionSignals?: string[];
}

export interface DailyBrief {
  briefId: string; // e.g. '2026-09-30-morning'
  userId: string;
  edition: 'morning' | 'evening';
  date: string; // 'YYYY-MM-DD'
  createdAt: string;
  estimatedMinutes: number;
  itemsCount: number;
  items: DailyBriefItem[];
  isCompleted: boolean;
}

export interface DailyBriefProgress {
  briefId: string;
  userId: string;
  activeIndex: number;
  completedItemIds: string[];
  skippedItemIds: string[];
  isCaughtUp: boolean;
  caughtUpAt?: string;
  timeSpentSeconds: number;
  lastUpdatedAt: string;
}

export interface UserRankingContext {
  userId: string;
  followedEntityIds: Set<string>;
  followedTopics: Set<string>;
  readingHistory: Map<string, { progress: number; lastReadAt: string; audioCompleted?: boolean }>;
  storyReadHistory: Map<string, { lastReadArticleId: string; lastReadAt: string; maxProgress: number }>;
  knowledgeFamiliarity: Map<string, UserKnowledgeState>;
  activeTrailIds: Set<string>;
  completedTrailIds: Set<string>;
}
