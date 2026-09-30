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
  const docRef = doc(db, 'posts', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const data = docSnap.data() as PlatformArticleRecord;
  return toDomainStory({ ...data, id: docSnap.id }, currentUserId, preferredLanguage);
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
