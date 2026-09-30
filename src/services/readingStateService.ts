import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  runTransaction,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { toDomainReadingState } from './mappers/readingStateMapper';
import type { ReadingState } from '../types/domain';
import type { PlatformReadingStateRecord } from '../types/platform';

/**
 * Reading State Service
 * 
 * Manages the canonical subcollection: users/{userId}/readingState/{articleId}
 * Strict owner-only access for cross-device synchronization (Desktop & Mobile).
 */

export async function getReadingState(
  userId: string,
  articleId: string,
): Promise<ReadingState | null> {
  if (!userId || !articleId) return null;
  const docRef = doc(db, 'users', userId, 'readingState', articleId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return toDomainReadingState(snap.data() as PlatformReadingStateRecord);
}

export function subscribeToReadingState(
  userId: string,
  articleId: string,
  onData: (state: ReadingState | null) => void,
  onError: (err: Error) => void,
): () => void {
  if (!userId || !articleId) {
    onData(null);
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'readingState', articleId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(toDomainReadingState(snap.data() as PlatformReadingStateRecord));
    },
    (error) => {
      console.warn('[ReadingStateService] Document subscription error:', error);
      onError(error);
    },
  );
}

export function subscribeToAllReadingStates(
  userId: string,
  onData: (states: ReadingState[]) => void,
  onError: (err: Error) => void,
  maxResults = 100,
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const statesQuery = query(
    collection(db, 'users', userId, 'readingState'),
    orderBy('lastOpenedAt', 'desc'),
    limit(maxResults),
  );

  return onSnapshot(
    statesQuery,
    (snap) => {
      const results: ReadingState[] = [];
      snap.forEach((d) => {
        results.push(toDomainReadingState(d.data() as PlatformReadingStateRecord));
      });
      onData(results);
    },
    (error) => {
      console.warn('[ReadingStateService] All states subscription error:', error);
      onError(error);
    },
  );
}

/**
 * Records that the article was opened meaningfully in StoryDetail.
 * Preserves `firstOpenedAt` if document already exists.
 */
export async function markArticleOpened(
  userId: string,
  articleId: string,
  preferredLanguage?: 'en' | 'hi' | 'te',
): Promise<void> {
  if (!userId || !articleId) return;

  const docRef = doc(db, 'users', userId, 'readingState', articleId);

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(docRef);
    const now = serverTimestamp();

    if (!existing.exists()) {
      transaction.set(docRef, {
        articleId,
        firstOpenedAt: now,
        lastOpenedAt: now,
        progress: 0.0,
        lastInteractionMode: 'reading',
        ...(preferredLanguage ? { preferredLanguage } : {}),
        updatedAt: now,
      });
    } else {
      const data = existing.data();
      transaction.update(docRef, {
        lastOpenedAt: now,
        ...(preferredLanguage && !data.preferredLanguage ? { preferredLanguage } : {}),
        updatedAt: now,
      });
    }
  });
}

/**
 * Updates reading progress monotonically.
 * Automatically marks completion when progress >= 0.90.
 */
export async function updateReadingProgress(
  userId: string,
  articleId: string,
  progress: number,
): Promise<void> {
  if (!userId || !articleId) return;

  const clampedProgress = Math.max(0.0, Math.min(1.0, progress));
  const docRef = doc(db, 'users', userId, 'readingState', articleId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    const now = serverTimestamp();
    const isCompleting = clampedProgress >= 0.90;

    if (!snap.exists()) {
      transaction.set(docRef, {
        articleId,
        firstOpenedAt: now,
        lastOpenedAt: now,
        progress: clampedProgress,
        lastInteractionMode: 'reading',
        ...(isCompleting ? { lastCompletedAt: now } : {}),
        updatedAt: now,
      });
    } else {
      const existingData = snap.data();
      const existingProgress = typeof existingData.progress === 'number' ? existingData.progress : 0.0;
      // Monotonic progress check (only increase progress during active reading)
      const newProgress = Math.max(existingProgress, clampedProgress);
      const shouldSetCompleted = isCompleting && !existingData.lastCompletedAt;

      transaction.update(docRef, {
        progress: newProgress,
        lastInteractionMode: 'reading',
        ...(shouldSetCompleted ? { lastCompletedAt: now } : {}),
        updatedAt: now,
      });
    }
  });
}

/**
 * Updates audio playback resume position.
 */
export async function updateAudioPosition(
  userId: string,
  articleId: string,
  positionSeconds: number,
  durationSeconds: number,
): Promise<void> {
  if (!userId || !articleId) return;

  const docRef = doc(db, 'users', userId, 'readingState', articleId);
  const validPos = Math.max(0, Math.floor(positionSeconds));
  const validDur = Math.max(0, Math.floor(durationSeconds));
  const now = serverTimestamp();

  await setDoc(
    docRef,
    {
      articleId,
      lastAudioPositionSeconds: validPos,
      audioDurationSeconds: validDur,
      lastInteractionMode: 'audio',
      updatedAt: now,
    },
    { merge: true },
  );
}

/**
 * Explicitly marks article as completed.
 */
export async function markArticleCompleted(
  userId: string,
  articleId: string,
): Promise<void> {
  if (!userId || !articleId) return;

  const docRef = doc(db, 'users', userId, 'readingState', articleId);
  const now = serverTimestamp();

  await setDoc(
    docRef,
    {
      articleId,
      progress: 1.0,
      lastCompletedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}

/**
 * Updates article-specific language preference without changing global user setting.
 */
export async function setArticleLanguageState(
  userId: string,
  articleId: string,
  preferredLanguage: 'en' | 'hi' | 'te',
): Promise<void> {
  if (!userId || !articleId) return;

  const docRef = doc(db, 'users', userId, 'readingState', articleId);
  await setDoc(
    docRef,
    {
      articleId,
      preferredLanguage,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Throttled Reading State Writer
 * 
 * Batches and debounces progress writes to prevent Firestore write spikes.
 * Only writes to cloud when:
 * 1. Milestone crossed (>= 10% change delta e.g. 25%, 50%, 75%, 90%+) OR
 * 2. Inactivity debounce timeout (2500ms) elapses OR
 * 3. Flush is explicitly invoked on unmount / navigation.
 */
export class ThrottledReadingStateWriter {
  private userId: string;
  private articleId: string;
  private lastWrittenProgress: number = 0;
  private pendingProgress: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(userId: string, articleId: string, initialProgress: number = 0) {
    this.userId = userId;
    this.articleId = articleId;
    this.lastWrittenProgress = initialProgress;
    this.pendingProgress = initialProgress;
  }

  public recordProgress(progress: number): void {
    if (this.isDestroyed) return;
    const clamped = Math.max(0.0, Math.min(1.0, progress));
    this.pendingProgress = Math.max(this.pendingProgress, clamped);

    // If delta exceeds 10% or crosses completion threshold (0.90), write immediately
    const delta = this.pendingProgress - this.lastWrittenProgress;
    if (delta >= 0.10 || (this.pendingProgress >= 0.90 && this.lastWrittenProgress < 0.90)) {
      this.flush();
      return;
    }

    // Otherwise debounce for 2500ms
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.flush();
    }, 2500);
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingProgress > this.lastWrittenProgress) {
      const progressToWrite = this.pendingProgress;
      this.lastWrittenProgress = progressToWrite;
      updateReadingProgress(this.userId, this.articleId, progressToWrite).catch((err) => {
        console.warn('[ThrottledReadingStateWriter] Progress write error:', err);
      });
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.flush();
  }
}
