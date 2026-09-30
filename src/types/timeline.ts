import type { Timestamp } from 'firebase/firestore';
import type { StoryThread } from './domain';

// ==========================================
// 1. PLATFORM TRANSPORT INTERFACES (FIRESTORE)
// ==========================================

export type TimelineEventType =
  | 'announcement'
  | 'development'
  | 'update'
  | 'launch'
  | 'regulatory'
  | 'financial'
  | 'correction'
  | 'other';

export type DatePrecision =
  | 'exact_day'
  | 'month'
  | 'year'
  | 'approximate'
  | 'publication_fallback';

export interface PlatformTimelineEventRecord {
  id: string;
  storyId: string;
  occurredAt: Timestamp;
  datePrecision: DatePrecision;
  title: string;
  summary: string;
  sourceArticleIds: string[];
  sourceUrls?: string[];
  type: TimelineEventType;
  importance: number; // 1 to 5
  supersedesEventId?: string;
  correctedByEventId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StoryChangeType =
  | 'value_changed'
  | 'new_fact'
  | 'additional_detail'
  | 'status_changed'
  | 'location_added'
  | 'location_removed'
  | 'date_changed'
  | 'participant_added'
  | 'correction'
  | 'no_change';

export interface PlatformStoryChange {
  id: string;
  type: StoryChangeType;
  subject: string;
  previousValue?: string | number | null;
  newValue?: string | number | null;
  description: string;
  importance: number; // 1 to 5
  userFacing: boolean;
  reason?: string;
  evidence?: {
    articleId: string;
    sourceUrl?: string;
  };
}

export interface PlatformStoryUpdateRecord {
  id: string;
  storyId: string;
  sourceArticleId: string;
  createdAt: Timestamp;
  changes: PlatformStoryChange[];
}

// ==========================================
// 2. CLIENT DOMAIN INTERFACES
// ==========================================

export interface StoryTimelineEvent {
  id: string;
  storyId: string;
  occurredAt: string; // ISO string
  datePrecision: DatePrecision;
  title: string;
  summary: string;
  sourceArticleIds: string[];
  sourceUrls?: string[];
  type: TimelineEventType;
  importance: number;
  supersedesEventId?: string;
  correctedByEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryChange {
  id: string;
  type: StoryChangeType;
  subject: string;
  previousValue?: string | number | null;
  newValue?: string | number | null;
  description: string;
  importance: number;
  userFacing: boolean;
  reason?: string;
  evidence?: {
    articleId: string;
    sourceUrl?: string;
  };
}

export interface StoryUpdate {
  id: string;
  storyId: string;
  sourceArticleId: string;
  createdAt: string; // ISO string
  changes: StoryChange[];
}

export interface StructuredFact {
  id: string;
  subject: string; // e.g., 'workforce_target', 'facility_location', 'investment_amount'
  label: string;   // e.g., 'Planned Workforce', 'Manufacturing Facility'
  value: string | number;
  unit?: string;   // e.g., 'crore', 'employees', 'MW', '%'
  category: 'metric' | 'location' | 'status' | 'date' | 'partner' | 'other';
  sourceArticleId: string;
  observedAt: string; // ISO string
}

export interface SinceYouLastReadResult {
  storyId: string;
  lastReadAt: string | null; // ISO string or null if never read
  meaningfulUpdateCount: number;
  meaningfulChangeCount: number;
  changes: StoryChange[];
}

export interface ContinuingStoryItem {
  story: StoryThread;
  updateCount: number;
  latestUpdate: StoryUpdate;
  lastReadAt: string | null;
}
