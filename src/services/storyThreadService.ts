import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  writeBatch,
  serverTimestamp,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { toDomainStoryThread } from './mappers/storyThreadMapper';
import { toDomainStory } from './mappers/articleMapper';
import { generateStoryId, generateSlug } from './storyMatchingService';
import { extractEntities } from './entityExtractionService';
import type { Story, StoryThread } from '../types/domain';
import type { PlatformStoryRecord, PlatformArticleRecord } from '../types/platform';

/**
 * Story Thread Service: Encapsulates all Firestore queries and lifecycle operations for canonical story clusters.
 */

export async function getStoryThread(storyId: string): Promise<StoryThread | null> {
  const storyRef = doc(db, 'stories', storyId);
  const snap = await getDoc(storyRef);
  if (!snap.exists()) return null;
  return toDomainStoryThread(snap.data() as PlatformStoryRecord);
}

export function observeStoryThread(
  storyId: string,
  callback: (thread: StoryThread | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const storyRef = doc(db, 'stories', storyId);
  return onSnapshot(
    storyRef,
    (snap) => {
      if (snap.exists()) {
        callback(toDomainStoryThread(snap.data() as PlatformStoryRecord));
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error(`[StoryThreadService] Listener error for ${storyId}:`, err);
      if (onError) onError(err);
    },
  );
}

export async function getStoryArticles(
  storyId: string,
  preferredLanguage = 'en',
  currentUserId?: string,
): Promise<Story[]> {
  const story = await getStoryThread(storyId);
  if (!story || story.articleIds.length === 0) return [];

  const articles: Story[] = [];
  for (const articleId of story.articleIds) {
    const postRef = doc(db, 'posts', articleId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const data = postSnap.data() as PlatformArticleRecord;
      articles.push(toDomainStory({ ...data, id: postSnap.id }, currentUserId, preferredLanguage));
    }
  }

  // Sort chronological (oldest to newest for timeline progression)
  articles.sort((a, b) => {
    const timeA = a.publishedAt?.getTime() || a.createdAt?.getTime() || 0;
    const timeB = b.publishedAt?.getTime() || b.createdAt?.getTime() || 0;
    return timeA - timeB;
  });

  return articles;
}

export async function listStories(limitCount = 50): Promise<StoryThread[]> {
  const q = query(collection(db, 'stories'), limit(limitCount));
  const snap = await getDocs(q);
  const stories: StoryThread[] = [];
  snap.forEach((docSnap) => {
    stories.push(toDomainStoryThread(docSnap.data() as PlatformStoryRecord));
  });

  // Sort newest updated first
  return stories.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
}

/**
 * Creates a brand new StoryThread and attaches the initial article atomically.
 */
export async function createStoryThread(
  initialArticle: Story | { id: string; title: string; category: string; summary?: string; publishedAt?: Date | null; heroImage?: string | null },
  options?: { customTitle?: string; customSummary?: string; storyId?: string },
): Promise<StoryThread> {
  const storyId = options?.storyId || generateStoryId();
  const title = (options?.customTitle || initialArticle.title).trim();
  const slug = generateSlug(title);
  const summary = (options?.customSummary || ('quickBrief' in initialArticle ? initialArticle.quickBrief?.quickSummary : initialArticle.summary) || title).trim();
  const primaryTopic = initialArticle.category || 'General';
  const articlePublishedDate = initialArticle.publishedAt || new Date();

  // Extract entities
  const fullText = `${title} ${summary}`;
  const entities = extractEntities(fullText);
  const entityIds = entities.map((e) => e.id);

  const storyRecord: PlatformStoryRecord = {
    storyId,
    title,
    slug,
    summary,
    primaryTopic,
    status: 'developing',
    entityIds,
    articleIds: [initialArticle.id],
    latestArticleId: initialArticle.id,
    firstPublishedAt: Timestamp.fromDate(articlePublishedDate),
    lastUpdatedAt: Timestamp.fromDate(articlePublishedDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    heroImage: initialArticle.heroImage || null,
    importance: 50,
    region: 'India',
  };

  const batch = writeBatch(db);
  const storyRef = doc(db, 'stories', storyId);
  const postRef = doc(db, 'posts', initialArticle.id);

  batch.set(storyRef, storyRecord);
  batch.update(postRef, { storyId });

  await batch.commit();

  return toDomainStoryThread({
    ...storyRecord,
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    firstPublishedAt: { seconds: Math.floor(articlePublishedDate.getTime() / 1000), nanoseconds: 0 },
    lastUpdatedAt: { seconds: Math.floor(articlePublishedDate.getTime() / 1000), nanoseconds: 0 },
  });
}

/**
 * Attaches an article to an existing StoryThread idempotently and atomically.
 */
export async function attachArticleToStory(
  storyId: string,
  article: Story | { id: string; title: string; category: string; summary?: string; publishedAt?: Date | null },
  options?: { updateTitle?: string; updateSummary?: string },
): Promise<StoryThread> {
  const storyRef = doc(db, 'stories', storyId);
  const postRef = doc(db, 'posts', article.id);

  const storySnap = await getDoc(storyRef);
  if (!storySnap.exists()) {
    throw new Error(`Target StoryThread ${storyId} does not exist.`);
  }

  const existingData = storySnap.data() as PlatformStoryRecord;
  const existingArticleIds = Array.isArray(existingData.articleIds) ? existingData.articleIds : [];

  // Idempotency check: if article is already attached, no-op
  if (existingArticleIds.includes(article.id)) {
    return toDomainStoryThread(existingData);
  }

  const updatedArticleIds = [...existingArticleIds, article.id];
  const articlePublishedDate = article.publishedAt || new Date();

  // Extract new entities
  const newEntities = extractEntities(`${article.title} ${options?.updateSummary || ''}`);
  const combinedEntityIds = Array.from(new Set([...(existingData.entityIds || []), ...newEntities.map((e) => e.id)]));

  const updates: Partial<PlatformStoryRecord> = {
    articleIds: updatedArticleIds,
    latestArticleId: article.id,
    lastUpdatedAt: Timestamp.fromDate(articlePublishedDate),
    updatedAt: serverTimestamp(),
    entityIds: combinedEntityIds,
    ...(options?.updateTitle ? { title: options.updateTitle, slug: generateSlug(options.updateTitle) } : {}),
    ...(options?.updateSummary ? { summary: options.updateSummary } : {}),
  };

  const batch = writeBatch(db);
  batch.update(storyRef, updates);
  batch.update(postRef, { storyId });

  await batch.commit();

  return toDomainStoryThread({
    ...existingData,
    ...updates,
    updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    lastUpdatedAt: { seconds: Math.floor(articlePublishedDate.getTime() / 1000), nanoseconds: 0 },
  } as PlatformStoryRecord);
}

/**
 * Merges source StoryThread into target StoryThread. Moves all article memberships and updates posts atomically.
 */
export async function mergeStoryThreads(sourceStoryId: string, targetStoryId: string): Promise<StoryThread> {
  if (sourceStoryId === targetStoryId) {
    throw new Error('Cannot merge a story thread into itself.');
  }

  const sourceSnap = await getDoc(doc(db, 'stories', sourceStoryId));
  const targetSnap = await getDoc(doc(db, 'stories', targetStoryId));

  if (!sourceSnap.exists()) throw new Error(`Source story ${sourceStoryId} not found.`);
  if (!targetSnap.exists()) throw new Error(`Target story ${targetStoryId} not found.`);

  const sourceData = sourceSnap.data() as PlatformStoryRecord;
  const targetData = targetSnap.data() as PlatformStoryRecord;

  const sourceArticleIds = sourceData.articleIds || [];
  const targetArticleIds = targetData.articleIds || [];
  const mergedArticleIds = Array.from(new Set([...targetArticleIds, ...sourceArticleIds]));
  const mergedEntityIds = Array.from(new Set([...(targetData.entityIds || []), ...(sourceData.entityIds || [])]));

  const batch = writeBatch(db);

  // Update target story
  batch.update(doc(db, 'stories', targetStoryId), {
    articleIds: mergedArticleIds,
    latestArticleId: mergedArticleIds[mergedArticleIds.length - 1],
    entityIds: mergedEntityIds,
    updatedAt: serverTimestamp(),
  });

  // Re-point all source articles to target storyId
  for (const articleId of sourceArticleIds) {
    batch.update(doc(db, 'posts', articleId), { storyId: targetStoryId });
  }

  // Mark source story as closed / merged (non-destructive archival)
  batch.update(doc(db, 'stories', sourceStoryId), {
    status: 'closed',
    articleIds: [],
    summary: `Merged into ${targetStoryId}`,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  const updatedTarget = await getDoc(doc(db, 'stories', targetStoryId));
  return toDomainStoryThread(updatedTarget.data() as PlatformStoryRecord);
}

/**
 * Splits selected articles out of a StoryThread into a brand new StoryThread.
 */
export async function splitStoryThread(
  storyId: string,
  articleIdsToExtract: string[],
  newStoryMetadata: { title: string; summary?: string },
): Promise<{ originalStory: StoryThread; newStory: StoryThread }> {
  if (articleIdsToExtract.length === 0) {
    throw new Error('At least one articleId must be provided to split.');
  }

  const origSnap = await getDoc(doc(db, 'stories', storyId));
  if (!origSnap.exists()) throw new Error(`Story ${storyId} not found.`);

  const origData = origSnap.data() as PlatformStoryRecord;
  const remainingArticleIds = (origData.articleIds || []).filter((id) => !articleIdsToExtract.includes(id));

  if (remainingArticleIds.length === 0) {
    throw new Error('Cannot split all articles out of story; use rename or merge instead.');
  }

  const newStoryId = generateStoryId();
  const newSlug = generateSlug(newStoryMetadata.title);
  const entities = extractEntities(`${newStoryMetadata.title} ${newStoryMetadata.summary || ''}`);

  const newStoryRecord: PlatformStoryRecord = {
    storyId: newStoryId,
    title: newStoryMetadata.title,
    slug: newSlug,
    summary: newStoryMetadata.summary || newStoryMetadata.title,
    primaryTopic: origData.primaryTopic,
    status: 'developing',
    entityIds: entities.map((e) => e.id),
    articleIds: articleIdsToExtract,
    latestArticleId: articleIdsToExtract[articleIdsToExtract.length - 1],
    firstPublishedAt: origData.firstPublishedAt,
    lastUpdatedAt: origData.lastUpdatedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    region: origData.region || 'India',
  };

  const batch = writeBatch(db);

  // Create new story
  batch.set(doc(db, 'stories', newStoryId), newStoryRecord);

  // Update extracted posts
  for (const articleId of articleIdsToExtract) {
    batch.update(doc(db, 'posts', articleId), { storyId: newStoryId });
  }

  // Update original story
  batch.update(doc(db, 'stories', storyId), {
    articleIds: remainingArticleIds,
    latestArticleId: remainingArticleIds[remainingArticleIds.length - 1],
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  const [updatedOrigSnap, createdNewSnap] = await Promise.all([
    getDoc(doc(db, 'stories', storyId)),
    getDoc(doc(db, 'stories', newStoryId)),
  ]);

  return {
    originalStory: toDomainStoryThread(updatedOrigSnap.data() as PlatformStoryRecord),
    newStory: toDomainStoryThread(createdNewSnap.data() as PlatformStoryRecord),
  };
}
