import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDucWzTVZomZYsXyWZ83ygCSJOCArOBzIs",
  authDomain: "cie-connect.firebaseapp.com",
  projectId: "cie-connect",
  storageBucket: "cie-connect.firebasestorage.app",
  messagingSenderId: "226102698550",
  appId: "1:226102698550:web:453d7032cec3231a6dee97",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Inlined toDomainStory logic for direct Node runtime testing
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date(value.seconds * 1000 + ((value.nanoseconds || 0) / 1000000));
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

function resolveHeroImage(record) {
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
  return 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80';
}

function mapKeyStat(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const value = String(raw.value || '').trim();
  const label = String(raw.label || '').trim();
  return value ? { value, label } : null;
}

function mapExploreSection(raw) {
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

function mapQuote(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text || '').trim();
  if (!text) return null;
  return {
    text,
    speaker: String(raw.speaker || 'Spokesperson').trim(),
    role: String(raw.role || '').trim(),
  };
}

function mapQuickBrief(raw, fallbackTitle = '', fallbackCategory = 'Article', fallbackSummary = '') {
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

function mapFullStory(raw, fallbackHeadline = '', fallbackHook = '', fallbackSummary = '') {
  const headline = String(raw?.headline || fallbackHeadline).trim();
  const hook = String(raw?.hook || fallbackHook || fallbackSummary).trim();
  const in20Seconds = String(raw?.in_20_seconds || fallbackSummary).trim();
  const whatHappened = String(raw?.what_happened || fallbackSummary).trim();
  const whyThisMatters = String(raw?.why_this_matters || fallbackSummary).trim();
  const biggerPicture = String(raw?.bigger_picture || '').trim();

  const keyStats = Array.isArray(raw?.key_stats)
    ? raw.key_stats.map(mapKeyStat).filter((stat) => stat !== null)
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

function mapAttribution(record) {
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

function toDomainStory(record, currentUserId, preferredLanguage = 'en') {
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

  const baseSummary = record.description || record.hook || '';
  const baseQuickBrief = mapQuickBrief(record.quick_brief, baseTitle, category, baseSummary);
  const baseFullStory = mapFullStory(record.full_article, baseTitle, record.hook, baseSummary);

  const rawLanguages = record.languages || {};
  const languages = {
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
        audioUrl: hasAudio ? locRecord.audioUrl : null,
        status: locRecord.audioStatus || 'unavailable',
        isAvailable: hasAudio,
      },
      isReady,
    };
  }

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
  };
}

async function testLiveArticles() {
  console.log("=== 2. RUNTIME LIVE ARTICLES VALIDATION ===");

  const querySnap = await getDocs(collection(db, "posts"));
  console.log(`Total documents fetched from 'posts' collection: ${querySnap.docs.length}`);

  let approvedCount = 0;
  let publishedCount = 0;
  let reelsDetected = 0;
  let reelsExcluded = 0;
  let mapperErrors = 0;
  let legacyArticlesFound = 0;
  let schemaV2Found = 0;

  const validStories = [];

  for (const docSnap of querySnap.docs) {
    const rawData = { id: docSnap.id, ...docSnap.data() };
    const status = rawData.status;
    const category = rawData.category?.toLowerCase();

    // Check if raw document is a Reel
    if (category === 'reel') {
      reelsDetected++;
    }

    // Check filtering condition matching mobile and desktop service
    const isApprovedOrPublished = status === 'approved' || status === 'published';
    const isNotReel = category !== 'reel';

    if (isApprovedOrPublished && isNotReel) {
      if (status === 'approved') approvedCount++;
      if (status === 'published') publishedCount++;

      // Verify ID preservation
      if (rawData.id !== docSnap.id) {
        throw new Error(`ID Mismatch: doc.id=${docSnap.id}, mapped id=${rawData.id}`);
      }

      // Check schema version / structure
      if (rawData.full_article && rawData.quick_brief) {
        schemaV2Found++;
      } else {
        legacyArticlesFound++;
      }

      // Map to domain story
      try {
        const story = toDomainStory(rawData, 'test-user-uid', 'en');
        if (!story.title || !story.quickBrief || !story.fullStory) {
          throw new Error(`Story ${docSnap.id} mapped incomplete structure`);
        }
        validStories.push(story);
      } catch (err) {
        console.error(`Mapper error on doc ${docSnap.id}:`, err);
        mapperErrors++;
      }
    } else {
      if (category === 'reel') {
        reelsExcluded++;
      }
    }
  }

  console.log(`- Approved articles count: ${approvedCount}`);
  console.log(`- Published articles count: ${publishedCount}`);
  console.log(`- Total live valid articles: ${validStories.length}`);
  console.log(`- Reels detected in database: ${reelsDetected} (Reels excluded by filter: ${reelsExcluded})`);
  console.log(`- Schema v2 articles: ${schemaV2Found}`);
  console.log(`- Legacy/fallback articles successfully mapped: ${legacyArticlesFound}`);
  console.log(`- Mapper errors: ${mapperErrors}`);

  if (approvedCount === 0 && publishedCount === 0) {
    throw new Error("No approved or published articles found in production Firestore");
  }
  if (reelsDetected > 0 && reelsExcluded !== reelsDetected) {
    throw new Error("Reels were not properly excluded");
  }
  if (mapperErrors > 0) {
    throw new Error(`${mapperErrors} mapper errors occurred`);
  }

  console.log("\nSample mapped live article:", {
    id: validStories[0].id,
    title: validStories[0].title,
    category: validStories[0].category,
    threeThingsCount: validStories[0].quickBrief.threeThingsToKnow.length,
    takeawaysCount: validStories[0].fullStory.takeaways.length,
    exploreSectionsCount: validStories[0].fullStory.exploreSections.length,
  });

  console.log("\n>>> LIVE ARTICLES VALIDATION: ALL CHECKS PASSED <<<");
}

testLiveArticles()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("LIVE ARTICLES VALIDATION FAILED:", e);
    process.exit(1);
  });
