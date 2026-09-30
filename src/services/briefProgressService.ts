/**
 * Daily Brief Progress Service
 * Platform Phase 16F.5
 *
 * Manages item completion, skip actions, and "Caught Up" state
 * at users/{userId}/briefProgress/{briefId}.
 *
 * CRITICAL RULE (Phase 16F.5):
 * Brief item completion modifies ONLY briefProgress.
 * Full article readingState changes ONLY through the real article reader.
 */

import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { DailyBriefItem, DailyBriefProgress } from '../types/brief';
import { mapDailyBriefProgressToDoc, mapDocToDailyBriefProgress } from './mappers/briefMapper';

export class BriefProgressService {
  /**
   * Fetches the current progress state for a brief.
   */
  async getProgress(userId: string, briefId: string): Promise<DailyBriefProgress | null> {
    if (!userId || !briefId) return null;

    try {
      const docRef = doc(db, 'users', userId, 'briefProgress', briefId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return mapDocToDailyBriefProgress(snap.id, snap.data());
      }
    } catch (err) {
      console.warn(`[BriefProgressService] Error fetching progress for ${briefId}:`, err);
    }
    return null;
  }

  /**
   * Subscribes to real-time updates for a brief progress document.
   */
  subscribeToProgress(
    userId: string,
    briefId: string,
    onData: (progress: DailyBriefProgress | null) => void,
    onError: (err: Error) => void
  ): () => void {
    if (!userId || !briefId) {
      onData(null);
      return () => {};
    }

    const docRef = doc(db, 'users', userId, 'briefProgress', briefId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          onData(null);
          return;
        }
        onData(mapDocToDailyBriefProgress(snap.id, snap.data()));
      },
      (err) => {
        console.warn(`[BriefProgressService] Subscription error for ${briefId}:`, err);
        onError(err);
      }
    );
  }

  /**
   * Resolves the index of the first item not present in completedItemIds or skippedItemIds.
   */
  resolveNextUnresolvedIndex(
    items: DailyBriefItem[],
    completedItemIds: string[] | Set<string>,
    skippedItemIds: string[] | Set<string>
  ): number {
    const completedSet = completedItemIds instanceof Set ? completedItemIds : new Set(completedItemIds);
    const skippedSet = skippedItemIds instanceof Set ? skippedItemIds : new Set(skippedItemIds);

    for (let i = 0; i < items.length; i++) {
      const itemId = items[i].id;
      if (!completedSet.has(itemId) && !skippedSet.has(itemId)) {
        return i;
      }
    }
    return Math.max(0, items.length - 1);
  }

  /**
   * Marks a specific brief item as completed and advances progress.
   * Handled items = completed ∪ skipped.
   * Caught up when handledItemCount == totalItemsCount.
   */
  async markItemCompleted(
    userId: string,
    briefId: string,
    itemId: string,
    totalItemsCount = 5,
    timeSpentDeltaSeconds = 30
  ): Promise<DailyBriefProgress> {
    const docRef = doc(db, 'users', userId, 'briefProgress', briefId);

    const updatedProgress = await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      const now = new Date().toISOString();

      let current: DailyBriefProgress;
      if (snap.exists()) {
        current = mapDocToDailyBriefProgress(snap.id, snap.data());
      } else {
        current = {
          briefId,
          userId,
          activeIndex: 0,
          completedItemIds: [],
          skippedItemIds: [],
          isCaughtUp: false,
          timeSpentSeconds: 0,
          lastUpdatedAt: now,
        };
      }

      const completedSet = new Set(current.completedItemIds);
      completedSet.add(itemId);

      const skippedSet = new Set(current.skippedItemIds);
      // If previously skipped, remove from skipped
      skippedSet.delete(itemId);

      const handledSet = new Set([...completedSet, ...skippedSet]);
      const isCaughtUp = handledSet.size >= totalItemsCount;
      const nextIndex = Math.min(totalItemsCount - 1, current.activeIndex + 1);

      const nextProgress: DailyBriefProgress = {
        ...current,
        completedItemIds: Array.from(completedSet),
        skippedItemIds: Array.from(skippedSet),
        activeIndex: nextIndex,
        isCaughtUp: isCaughtUp || current.isCaughtUp,
        caughtUpAt: isCaughtUp && !current.caughtUpAt ? now : current.caughtUpAt,
        timeSpentSeconds: current.timeSpentSeconds + timeSpentDeltaSeconds,
        lastUpdatedAt: now,
      };

      tx.set(docRef, mapDailyBriefProgressToDoc(nextProgress));
      return nextProgress;
    });

    return updatedProgress;
  }

  /**
   * Skips an item and moves to next index.
   * Handled items = completed ∪ skipped.
   */
  async skipItem(
    userId: string,
    briefId: string,
    itemId: string,
    totalItemsCount = 5
  ): Promise<DailyBriefProgress> {
    const docRef = doc(db, 'users', userId, 'briefProgress', briefId);

    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      const now = new Date().toISOString();

      let current: DailyBriefProgress;
      if (snap.exists()) {
        current = mapDocToDailyBriefProgress(snap.id, snap.data());
      } else {
        current = {
          briefId,
          userId,
          activeIndex: 0,
          completedItemIds: [],
          skippedItemIds: [],
          isCaughtUp: false,
          timeSpentSeconds: 0,
          lastUpdatedAt: now,
        };
      }

      const skippedSet = new Set(current.skippedItemIds);
      skippedSet.add(itemId);

      const completedSet = new Set(current.completedItemIds);
      const handledSet = new Set([...completedSet, ...skippedSet]);
      const isCaughtUp = handledSet.size >= totalItemsCount;
      const nextIndex = Math.min(totalItemsCount - 1, current.activeIndex + 1);

      const nextProgress: DailyBriefProgress = {
        ...current,
        skippedItemIds: Array.from(skippedSet),
        activeIndex: nextIndex,
        isCaughtUp: isCaughtUp || current.isCaughtUp,
        caughtUpAt: isCaughtUp && !current.caughtUpAt ? now : current.caughtUpAt,
        lastUpdatedAt: now,
      };

      tx.set(docRef, mapDailyBriefProgressToDoc(nextProgress));
      return nextProgress;
    });
  }

  /**
   * Sets the brief status to caught up directly.
   */
  async setCaughtUp(userId: string, briefId: string): Promise<void> {
    const docRef = doc(db, 'users', userId, 'briefProgress', briefId);
    const now = new Date().toISOString();

    await setDoc(
      docRef,
      mapDailyBriefProgressToDoc({
        briefId,
        userId,
        activeIndex: 0,
        completedItemIds: [],
        skippedItemIds: [],
        isCaughtUp: true,
        caughtUpAt: now,
        timeSpentSeconds: 0,
        lastUpdatedAt: now,
      }),
      { merge: true }
    );
  }
}

export const briefProgressService = new BriefProgressService();
