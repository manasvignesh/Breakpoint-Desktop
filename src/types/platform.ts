/**
 * Breakpoint Production Platform Transport Types
 * 
 * Exact production schemas reflecting Cloud Firestore and Supabase backend contracts.
 * Source: C:\Users\Public\New67\ (Cie-Daily-Studio/src/lib/types.ts & app/lib/features/discover/models/)
 */

export type PlatformKeyStat = {
  value: string;
  label: string;
};

export type PlatformExploreItem = {
  title: string;
  description: string;
};

export type PlatformExploreSection = {
  title: string;
  summary?: string;
  content: string;
  items?: PlatformExploreItem[];
};

export type PlatformQuickBrief = {
  category: string;
  headline: string;
  quick_summary: string;
  three_things_to_know: string[];
  key_number?: PlatformKeyStat | null;
};

export type PlatformQuote = {
  text: string;
  speaker: string;
  role?: string;
};

export type PlatformFullArticle = {
  headline: string;
  hook: string;
  in_20_seconds?: string;
  what_happened: string;
  why_this_matters: string;
  bigger_picture?: string;
  key_stats?: PlatformKeyStat[];
  explore_sections?: PlatformExploreSection[];
  takeaways?: string[];
  quote?: PlatformQuote | null;
};

export type PlatformLocalizedArticle = {
  title: string;
  quick_brief?: PlatformQuickBrief;
  full_article?: PlatformFullArticle;
  audioUrl?: string;
  translationStatus: 'pending' | 'processing' | 'ready' | 'failed';
  audioStatus: 'pending' | 'processing' | 'ready' | 'failed';
  originalHash?: string;
  processingStartedAt?: number | null;
};

export type PlatformArticleSourceType =
  | 'external'
  | 'original'
  | 'press_release'
  | 'official_source'
  | 'aggregated';

export interface PlatformArticleRecord {
  id: string;
  schema_version?: number;
  status?: string;
  category?: string;
  articleCategory?: string;
  title?: string;
  headline?: string;
  description?: string;
  hook?: string;
  quick_brief?: PlatformQuickBrief;
  full_article?: PlatformFullArticle;
  blocks?: unknown[];
  mediaUrls?: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  coverImage?: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  authorEmail?: string;
  author?: {
    name?: string;
    fullName?: string;
    avatarUrl?: string;
    email?: string;
  };
  sourceType?: PlatformArticleSourceType;
  originalPublisher?: string;
  originalSourceUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  breakpointEditor?: string;
  likesCount?: number;
  likedBy?: string[];
  bookmarkedBy?: string[];
  commentsCount?: number;
  estimatedReadTime?: number;
  isTodaysDrop?: boolean;
  isFeatured?: boolean;
  deckPriority?: number;
  raw_input?: string;
  languages?: Record<string, PlatformLocalizedArticle>;
  createdAt?: { seconds: number; nanoseconds: number } | string | number | null;
  publishedAt?: { seconds: number; nanoseconds: number } | string | number | null;
  updatedAt?: { seconds: number; nanoseconds: number } | string | number | null;
  metadata?: Record<string, unknown>;
  storyId?: string;
  entityIds?: string[];
  conceptIds?: string[];
}

export interface PlatformStoryRecord {
  storyId: string;
  title: string;
  slug: string;
  summary: string;
  primaryTopic: string;
  status: 'developing' | 'stable' | 'closed';
  entityIds: string[];
  conceptIds?: string[];
  articleIds: string[];
  latestArticleId: string;
  firstPublishedAt: unknown;
  lastUpdatedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  heroImage?: string | null;
  importance?: number;
  region?: string;
}

export interface PlatformUserRecord {
  uid: string;
  name?: string;
  fullName?: string;
  email?: string;
  photoUrl?: string;
  avatarUrl?: string;
  bio?: string;
  role?: string;
  department?: string;
  yearOfStudy?: string;
  interests?: string[];
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
  connectionCode?: string;
  notificationPreferences?: {
    enabled?: boolean;
    creatorContent?: boolean;
    messagePreviews?: boolean;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PlatformSavedRecord {
  postId: string;
  userId: string;
  savedAt: string;
}

export interface PlatformFollowRecord {
  followerId: string;
  targetUserId: string;
  createdAt: unknown;
}

export interface PlatformNotificationRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  type?: string;
  contentType?: string;
  contentId?: string;
  conversationId?: string;
  senderId?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  isRead?: boolean;
  pushStatus?: string;
  createdAt?: unknown;
}

export interface PlatformAudioRecord {
  audioUrl?: string;
  audioStatus: string;
  language: string;
}

export interface PlatformReadingStateRecord {
  articleId: string;
  firstOpenedAt: { seconds: number; nanoseconds: number } | string | number | null;
  lastOpenedAt: { seconds: number; nanoseconds: number } | string | number | null;
  progress: number; // 0.0 to 1.0
  lastCompletedAt?: { seconds: number; nanoseconds: number } | string | number | null;
  preferredLanguage?: 'en' | 'hi' | 'te';
  lastAudioPositionSeconds?: number;
  audioDurationSeconds?: number;
  lastInteractionMode?: 'reading' | 'audio' | 'brief';
  updatedAt?: { seconds: number; nanoseconds: number } | string | number | null;
}

export * from './timeline';
export * from './knowledge';

