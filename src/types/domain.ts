/**
 * Breakpoint Desktop Domain Types
 * 
 * Clean, normalized interfaces consumed throughout the desktop UI.
 * Mapped strictly from Platform Transport types.
 */

export interface KeyStat {
  value: string;
  label: string;
}

export interface ExploreSection {
  title: string;
  summary: string;
  content: string;
  items: Array<{ title: string; description: string }>;
}

export interface Quote {
  text: string;
  speaker: string;
  role: string;
}

export interface QuickBrief {
  category: string;
  headline: string;
  quickSummary: string;
  threeThingsToKnow: string[];
  keyNumber: KeyStat | null;
}

export interface FullStory {
  headline: string;
  hook: string;
  in20Seconds: string;
  whatHappened: string;
  whyThisMatters: string;
  biggerPicture: string;
  keyStats: KeyStat[];
  exploreSections: ExploreSection[];
  takeaways: string[];
  quote: Quote | null;
}

export interface ArticleAttribution {
  isOriginal: boolean;
  sourceType: 'external' | 'original' | 'press_release' | 'official_source' | 'aggregated';
  publisherName: string;
  sourceUrl: string | null;
  editor: string;
  authorName: string;
  publishedAt: Date | null;
}

export interface AudioTrack {
  language: string;
  audioUrl: string | null;
  status: 'ready' | 'pending' | 'processing' | 'failed' | 'unavailable';
  isAvailable: boolean;
}

export interface LocalizedStoryContent {
  title: string;
  quickBrief: QuickBrief;
  fullStory: FullStory;
  audioTrack: AudioTrack;
  isReady: boolean;
}

export interface Story {
  id: string;
  schemaVersion: number;
  category: string;
  title: string;
  heroImage: string;
  estimatedReadTime: number;
  isFeatured: boolean;
  isTodaysDrop: boolean;
  deckPriority: number;
  
  // Author & Attribution
  author: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
    email: string | null;
  };
  attribution: ArticleAttribution;

  // Social & Interaction
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;

  // Primary Content (in current active language)
  activeLanguage: string;
  quickBrief: QuickBrief;
  fullStory: FullStory;
  audioTrack: AudioTrack;

  // Multi-Language Support
  languages: Record<string, LocalizedStoryContent>;
  availableLanguages: string[];

  // Timestamps
  publishedAt: Date | null;
  createdAt: Date | null;

  // Canonical Story Thread Reference (Phase 16B/16D)
  storyId?: string;
  entityIds?: string[];
  conceptIds?: string[];
}

export interface StoryThread {
  id: string;                      // Stable storyId (e.g. st_01J...)
  title: string;                   // Evolving story title
  slug: string;                    // URL-safe slug
  summary: string;                 // Concise factual development summary
  primaryTopic: string;            // Broad category/topic
  status: 'developing' | 'stable' | 'closed';
  entityIds: string[];             // Normalized entity keys
  conceptIds?: string[];           // Normalized concept keys
  articleIds: string[];            // Member article IDs in chronological order
  latestArticleId: string;         // Most recent article ID
  articleCount: number;            // Total articles in thread
  firstPublishedAt: Date;          // Earliest article timestamp
  lastUpdatedAt: Date;             // Latest article/update timestamp
  createdAt: Date;
  updatedAt: Date;
  heroImage?: string | null;
  importance?: number;
  region?: string;
}

export interface NormalizedEntity {
  id: string;                      // Canonical ID (e.g. ent_openai, ent_isro)
  name: string;                    // Canonical name (e.g. "OpenAI", "ISRO")
  type: 'company' | 'organization' | 'person' | 'location' | 'product' | 'technology' | 'policy';
  aliases: string[];               // Known alias variations
}

export interface StoryMatchCandidate {
  story: StoryThread;
  confidence: number;              // 0.00 to 1.00
  decision: 'AUTO_ATTACH' | 'REVIEW_OR_SPLIT' | 'CREATE_NEW';
  signals: {
    entityScore: number;           // Jaccard similarity of entities
    headlineScore: number;         // Lexical/token overlap
    eventScore: number;            // Action/event predicate alignment
    temporalDecay: number;         // Freshness factor
    sharedEntities: string[];      // Overlapping entity IDs
  };
  reason: string;
}

export interface StoryMatchResult {
  action: 'ATTACH' | 'CREATE';
  targetStoryId?: string;
  proposedNewStory?: {
    title: string;
    summary: string;
    primaryTopic: string;
    entityIds: string[];
  };
  candidate?: StoryMatchCandidate;
}

export interface User {
  uid: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  bio: string;
  role: 'student' | 'creator' | 'admin' | 'editor';
  isStaff: boolean;
  department: string | null;
  yearOfStudy: string | null;
  interests: string[];
  followersCount: number;
  followingCount: number;
  connectionCode: string | null;
}

export interface LibraryItem {
  storyId: string;
  savedAt: Date;
  story?: Story;
}

export interface Follow {
  followerId: string;
  targetUserId: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  contentType?: string;
  contentId: string | null;
  conversationId?: string;
  senderId?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ReadingState {
  articleId: string;
  firstOpenedAt: Date;
  lastOpenedAt: Date;
  progress: number; // 0.0 to 1.0
  isCompleted: boolean;
  lastCompletedAt?: Date | null;
  preferredLanguage?: 'en' | 'hi' | 'te';
  lastAudioPositionSeconds?: number;
  audioDurationSeconds?: number;
  lastInteractionMode: 'reading' | 'audio' | 'brief';
  updatedAt: Date;
}

export * from './timeline';
export * from './knowledge';


