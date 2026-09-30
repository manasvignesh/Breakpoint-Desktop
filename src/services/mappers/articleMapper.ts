import type {
  PlatformArticleRecord,
  PlatformFullArticle,
  PlatformQuickBrief,
  PlatformKeyStat,
  PlatformExploreSection,
  PlatformQuote,
} from '../../types/platform';
import type {
  Story,
  QuickBrief,
  FullStory,
  KeyStat,
  ExploreSection,
  Quote,
  ArticleAttribution,
  LocalizedStoryContent,
} from '../../types/domain';

const DEFAULT_EDITORIAL_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80';

function parseDate(value: unknown): Date | null {
  if (!value) return null;
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
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }
  return null;
}

function resolveHeroImage(record: PlatformArticleRecord): string {
  const candidates = [
    record.imageUrl,
    record.coverImage,
    record.thumbnailUrl,
    ...(Array.isArray(record.mediaUrls) ? record.mediaUrls : []),
    record.metadata?.hero_image,
    record.metadata?.imageUrl,
    record.metadata?.source_image,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().startsWith('http')) {
      return candidate.trim();
    }
  }
  return DEFAULT_EDITORIAL_FALLBACK_IMAGE;
}

function mapKeyStat(raw?: PlatformKeyStat | null): KeyStat | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = String(raw.value || '').trim();
  const label = String(raw.label || '').trim();
  return value ? { value, label } : null;
}

function mapExploreSection(raw: PlatformExploreSection): ExploreSection {
  return {
    title: String(raw.title || 'Section').trim(),
    summary: String(raw.summary || '').trim(),
    content: String(raw.content || '').trim(),
    items: Array.isArray(raw.items)
      ? raw.items
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            title: String(item.title || '').trim(),
            description: String(item.description || '').trim(),
          }))
      : [],
  };
}

function mapQuote(raw?: PlatformQuote | null): Quote | null {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text || '').trim();
  if (!text) return null;
  return {
    text,
    speaker: String(raw.speaker || 'Spokesperson').trim(),
    role: String(raw.role || '').trim(),
  };
}

function mapQuickBrief(
  raw?: PlatformQuickBrief,
  fallbackTitle = '',
  fallbackCategory = 'Article',
  fallbackSummary = '',
): QuickBrief {
  const category = String(raw?.category || fallbackCategory).trim();
  const headline = String(raw?.headline || fallbackTitle).trim();
  const quickSummary = String(raw?.quick_summary || fallbackSummary).trim();
  const threeThings = Array.isArray(raw?.three_things_to_know)
    ? raw.three_things_to_know.map((s) => String(s || '').trim()).filter(Boolean)
    : [];

  return {
    category: category || 'Article',
    headline: headline || 'Untitled Brief',
    quickSummary: quickSummary || headline,
    threeThingsToKnow: threeThings.length ? threeThings : [quickSummary || headline],
    keyNumber: mapKeyStat(raw?.key_number),
  };
}

function mapFullStory(
  raw?: PlatformFullArticle,
  fallbackHeadline = '',
  fallbackHook = '',
  fallbackSummary = '',
): FullStory {
  const headline = String(raw?.headline || fallbackHeadline).trim();
  const hook = String(raw?.hook || fallbackHook || fallbackSummary).trim();
  const in20Seconds = String(raw?.in_20_seconds || fallbackSummary).trim();
  const whatHappened = String(raw?.what_happened || fallbackSummary).trim();
  const whyThisMatters = String(raw?.why_this_matters || fallbackSummary).trim();
  const biggerPicture = String(raw?.bigger_picture || '').trim();

  const keyStats = Array.isArray(raw?.key_stats)
    ? raw.key_stats.map(mapKeyStat).filter((stat): stat is KeyStat => stat !== null)
    : [];

  const exploreSections = Array.isArray(raw?.explore_sections) && raw.explore_sections.length
    ? raw.explore_sections.map(mapExploreSection)
    : whatHappened
      ? [
          {
            title: 'What Happened',
            summary: in20Seconds,
            content: whatHappened,
            items: [],
          },
        ]
      : [];

  const takeaways = Array.isArray(raw?.takeaways) && raw.takeaways.length
    ? raw.takeaways.map((s) => String(s || '').trim()).filter(Boolean)
    : [hook || headline];

  return {
    headline: headline || 'Untitled Story',
    hook: hook || headline,
    in20Seconds: in20Seconds || hook,
    whatHappened: whatHappened || hook,
    whyThisMatters: whyThisMatters || hook,
    biggerPicture,
    keyStats,
    exploreSections,
    takeaways,
    quote: mapQuote(raw?.quote),
  };
}

function mapAttribution(record: PlatformArticleRecord): ArticleAttribution {
  const sourceType = record.sourceType || 'external';
  const isOriginal = sourceType === 'original';
  const publisher = isOriginal
    ? 'Breakpoint'
    : record.originalPublisher || record.sourceName || 'External Publisher';
  const sourceUrl = isOriginal ? null : record.originalSourceUrl || record.sourceUrl || null;
  const editor = record.breakpointEditor || 'Breakpoint Editorial';
  const authorName = record.authorName || (isOriginal ? 'Breakpoint Editorial' : 'Reporter');

  return {
    isOriginal,
    sourceType,
    publisherName: publisher,
    sourceUrl,
    editor,
    authorName,
    publishedAt: parseDate(record.publishedAt) || parseDate(record.createdAt),
  };
}

export function toDomainStory(
  record: PlatformArticleRecord,
  currentUserId?: string,
  preferredLanguage = 'en',
): Story {
  const id = record.id;
  const schemaVersion = record.schema_version ?? 2;
  const category = record.category || record.articleCategory || 'Technology';
  const baseTitle = record.title || record.headline || 'Untitled Article';
  const heroImage = resolveHeroImage(record);
  const estimatedReadTime = record.estimatedReadTime || 2;
  const isFeatured = Boolean(record.isFeatured);
  const isTodaysDrop = Boolean(record.isTodaysDrop);
  const deckPriority = record.deckPriority ?? 999;

  const author = {
    id: record.authorId || null,
    name: record.authorName || record.author?.name || record.author?.fullName || 'Breakpoint Editorial',
    avatarUrl: record.authorAvatar || record.author?.avatarUrl || null,
    email: record.authorEmail || record.author?.email || null,
  };

  const attribution = mapAttribution(record);

  const likedBy = Array.isArray(record.likedBy) ? record.likedBy : [];
  const bookmarkedBy = Array.isArray(record.bookmarkedBy) ? record.bookmarkedBy : [];
  const likesCount = record.likesCount ?? likedBy.length;
  const commentsCount = record.commentsCount ?? 0;
  const isLiked = currentUserId ? likedBy.includes(currentUserId) : false;
  const isSaved = currentUserId ? bookmarkedBy.includes(currentUserId) : false;

  // 1. Base English version
  const baseSummary = record.description || record.hook || '';
  const baseQuickBrief = mapQuickBrief(record.quick_brief, baseTitle, category, baseSummary);
  const baseFullStory = mapFullStory(record.full_article, baseTitle, record.hook, baseSummary);

  const rawLanguages = record.languages || {};
  const languages: Record<string, LocalizedStoryContent> = {
    en: {
      title: baseTitle,
      quickBrief: baseQuickBrief,
      fullStory: baseFullStory,
      audioTrack: {
        language: 'en',
        audioUrl: rawLanguages['en']?.audioUrl || null,
        status: rawLanguages['en']?.audioStatus === 'ready' ? 'ready' : (rawLanguages['en']?.audioUrl ? 'ready' : 'unavailable'),
        isAvailable: Boolean(rawLanguages['en']?.audioUrl),
      },
      isReady: true,
    },
  };

  // 2. Process localized entries
  for (const [langKey, locRecord] of Object.entries(rawLanguages)) {
    if (langKey === 'en' || !locRecord) continue;
    const isReady = locRecord.translationStatus === 'ready';
    const locQuickBrief = locRecord.quick_brief
      ? mapQuickBrief(locRecord.quick_brief, locRecord.title, category)
      : baseQuickBrief;
    const locFullStory = locRecord.full_article
      ? mapFullStory(locRecord.full_article, locRecord.title)
      : baseFullStory;
    const hasAudio = locRecord.audioStatus === 'ready' && Boolean(locRecord.audioUrl);

    languages[langKey] = {
      title: locRecord.title || baseTitle,
      quickBrief: isReady ? locQuickBrief : baseQuickBrief,
      fullStory: isReady ? locFullStory : baseFullStory,
      audioTrack: {
        language: langKey,
        audioUrl: hasAudio ? locRecord.audioUrl! : null,
        status: locRecord.audioStatus || 'unavailable',
        isAvailable: hasAudio,
      },
      isReady,
    };
  }

  // 3. Resolve active content for target language
  const targetLoc = languages[preferredLanguage]?.isReady ? languages[preferredLanguage] : languages['en'];
  const activeLanguage = languages[preferredLanguage]?.isReady ? preferredLanguage : 'en';

  return {
    id,
    schemaVersion,
    category,
    title: targetLoc.title,
    heroImage,
    estimatedReadTime,
    isFeatured,
    isTodaysDrop,
    deckPriority,
    author,
    attribution,
    likesCount,
    commentsCount,
    isLiked,
    isSaved,
    activeLanguage,
    quickBrief: targetLoc.quickBrief,
    fullStory: targetLoc.fullStory,
    audioTrack: targetLoc.audioTrack,
    languages,
    availableLanguages: Object.keys(languages),
    publishedAt: parseDate(record.publishedAt) || parseDate(record.createdAt),
    createdAt: parseDate(record.createdAt),
    storyId: record.storyId || undefined,
  };
}
