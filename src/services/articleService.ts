import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { toDomainStory } from './mappers/articleMapper';
import type { Story } from '../types/domain';
import type { PlatformArticleRecord } from '../types/platform';

export function subscribeToPublishedArticles(
  onData: (stories: Story[]) => void,
  onError: (error: Error) => void,
  preferredLanguage = 'en',
  currentUserId?: string,
) {
  // Query all posts from the canonical Firestore collection
  const postsQuery = query(
    collection(db, 'posts'),
    limit(100),
  );

  return onSnapshot(
    postsQuery,
    (snapshot) => {
      const stories: Story[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PlatformArticleRecord;
        const id = docSnap.id;
        const category = String(data.category || '').toLowerCase();
        const status = String(data.status || '').toLowerCase();

        // Mobile platform filter: approved/published articles, exclude Reels
        const isApproved = status === 'approved' || status === 'published';
        const isNotReel = category !== 'reel';

        if (isApproved && isNotReel) {
          const story = toDomainStory({ ...data, id }, currentUserId, preferredLanguage);
          stories.push(story);
        }
      });

      // Sort chronologically (newest first)
      stories.sort((a, b) => {
        const timeA = a.publishedAt?.getTime() || a.createdAt?.getTime() || 0;
        const timeB = b.publishedAt?.getTime() || b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });

      onData(stories);
    },
    (err) => {
      console.error('[ArticleService] Subscription error:', err);
      onError(err);
    },
  );
}

export async function fetchArticleById(
  id: string,
  preferredLanguage = 'en',
  currentUserId?: string,
): Promise<Story | null> {
  if (!id) return null;

  // 1. Try fetching article directly from posts collection
  const postDocRef = doc(db, 'posts', id);
  const postSnap = await getDoc(postDocRef);
  if (postSnap.exists()) {
    const data = postSnap.data() as PlatformArticleRecord;
    return toDomainStory({ ...data, id: postSnap.id }, currentUserId, preferredLanguage);
  }

  // 2. Fallback: Check if id is a canonical storyId in stories collection
  try {
    const storyDocRef = doc(db, 'stories', id);
    const storySnap = await getDoc(storyDocRef);
    if (storySnap.exists()) {
      const storyData = storySnap.data() as {
        latestArticleId?: string;
        leadArticleId?: string;
        articleIds?: string[];
      };
      const targetArticleId =
        storyData.latestArticleId ||
        storyData.leadArticleId ||
        (Array.isArray(storyData.articleIds) && storyData.articleIds.length > 0
          ? storyData.articleIds[storyData.articleIds.length - 1]
          : null);

      if (targetArticleId && targetArticleId !== id) {
        return await fetchArticleById(targetArticleId, preferredLanguage, currentUserId);
      }
    }
  } catch (err) {
    console.warn(`[ArticleService] Story fallback lookup failed for ${id}:`, err);
  }

  return null;
}

export async function toggleArticleSaved(
  articleId: string,
  userId: string,
  isCurrentlySaved: boolean,
): Promise<void> {
  const docRef = doc(db, 'posts', articleId);
  await updateDoc(docRef, {
    bookmarkedBy: isCurrentlySaved ? arrayRemove(userId) : arrayUnion(userId),
  });
}
