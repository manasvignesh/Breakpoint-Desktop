import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  PlatformTimelineEventRecord,
  PlatformStoryUpdateRecord,
  StoryTimelineEvent,
  StoryUpdate,
  StoryChange,
  SinceYouLastReadResult,
  ContinuingStoryItem,
} from '../types/timeline';
import type { PlatformStoryRecord } from '../types/platform';
import { toDomainTimelineEvent, toDomainStoryUpdate } from './mappers/timelineMapper';
import { toDomainStoryThread } from './mappers/storyThreadMapper';
import { getReadingState } from './readingStateService';


/**
 * Service managing story timeline events, factual updates, and Since You Last Read derivations.
 */
export class StoryTimelineService {
  /**
   * Fetches the chronological timeline for a story thread.
   */
  async getTimeline(storyId: string): Promise<StoryTimelineEvent[]> {
    if (!storyId) return [];

    try {
      const timelineRef = collection(db, 'stories', storyId, 'timeline');
      const q = query(timelineRef, orderBy('occurredAt', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(docSnap => {
        const data = docSnap.data() as PlatformTimelineEventRecord;
        return toDomainTimelineEvent({ ...data, id: docSnap.id });
      });
    } catch (err) {
      console.warn(`[StoryTimelineService] Error fetching timeline for story ${storyId}:`, err);
      return [];
    }
  }

  /**
   * Subscribes to live updates on a story's timeline.
   */
  observeTimeline(storyId: string, callback: (events: StoryTimelineEvent[]) => void): () => void {
    if (!storyId) {
      callback([]);
      return () => {};
    }

    const timelineRef = collection(db, 'stories', storyId, 'timeline');
    const q = query(timelineRef, orderBy('occurredAt', 'asc'));

    return onSnapshot(
      q,
      snapshot => {
        const events = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as PlatformTimelineEventRecord;
          return toDomainTimelineEvent({ ...data, id: docSnap.id });
        });
        callback(events);
      },
      err => {
        console.warn(`[StoryTimelineService] Timeline listener error for story ${storyId}:`, err);
      }
    );
  }

  /**
   * Fetches all structured updates / deltas for a story thread.
   */
  async getUpdates(storyId: string): Promise<StoryUpdate[]> {
    if (!storyId) return [];

    try {
      const updatesRef = collection(db, 'stories', storyId, 'updates');
      const q = query(updatesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(docSnap => {
        const data = docSnap.data() as PlatformStoryUpdateRecord;
        return toDomainStoryUpdate({ ...data, id: docSnap.id });
      });
    } catch (err) {
      console.warn(`[StoryTimelineService] Error fetching updates for story ${storyId}:`, err);
      return [];
    }
  }

  /**
   * Derives "Since You Last Read" factual changes for a specific user on an evolving story.
   */
  async getChangesSinceLastRead(uid: string, storyId: string): Promise<SinceYouLastReadResult> {
    const emptyResult: SinceYouLastReadResult = {
      storyId,
      lastReadAt: null,
      meaningfulUpdateCount: 0,
      meaningfulChangeCount: 0,
      changes: [],
    };

    if (!uid || !storyId) return emptyResult;

    try {
      // 1. Fetch story document to retrieve member articleIds
      const storyDocRef = doc(db, 'stories', storyId);
      const storySnap = await getDoc(storyDocRef);
      if (!storySnap.exists()) return emptyResult;

      const storyData = storySnap.data() as PlatformStoryRecord;
      const articleIds = Array.isArray(storyData.articleIds) ? storyData.articleIds : [];
      if (articleIds.length === 0) return emptyResult;

      // 2. Query reading state across member articles to find latest interaction
      let latestInteractionMs = 0;
      let latestInteractionIso: string | null = null;

      const readingPromises = articleIds.map(articleId => getReadingState(uid, articleId));
      const readingStates = await Promise.all(readingPromises);

      for (const rs of readingStates) {
        if (rs && rs.lastOpenedAt) {
          const openedMs = rs.lastOpenedAt.getTime();
          if (openedMs > latestInteractionMs) {
            latestInteractionMs = openedMs;
            latestInteractionIso = rs.lastOpenedAt.toISOString();
          }
        }
      }

      // If user has never opened any article in this story, return empty (don't show "Since You Last Read" banner)
      if (latestInteractionMs === 0) {
        return emptyResult;
      }

      // 3. Fetch updates created after latestInteractionMs
      const updates = await this.getUpdates(storyId);
      const meaningfulChanges: StoryChange[] = [];
      const seenChangeKeys = new Set<string>();
      let meaningfulUpdateCount = 0;

      for (const update of updates) {
        const updateCreatedAtMs = new Date(update.createdAt).getTime();
        if (updateCreatedAtMs > latestInteractionMs) {
          // Filter only userFacing and non-additional_detail changes
          const userFacingInThisUpdate = (update.changes || []).filter(
            chg => chg.userFacing === true && chg.type !== 'additional_detail' && chg.type !== 'no_change'
          );

          if (userFacingInThisUpdate.length > 0) {
            meaningfulUpdateCount++;
            for (const chg of userFacingInThisUpdate) {
              const dedupKey = chg.id || `${chg.type}_${chg.subject}_${chg.newValue}`;
              if (!seenChangeKeys.has(dedupKey)) {
                seenChangeKeys.add(dedupKey);
                meaningfulChanges.push(chg);
              }
            }
          }
        }
      }

      return {
        storyId,
        lastReadAt: latestInteractionIso,
        meaningfulUpdateCount,
        meaningfulChangeCount: meaningfulChanges.length,
        changes: meaningfulChanges,
      };
    } catch (err) {
      console.warn(`[StoryTimelineService] Error deriving changes since last read for ${storyId}:`, err);
      return emptyResult;
    }
  }

  /**
   * Queries continuing stories that have new updates since the user's latest interaction.
   */
  async getContinuingStories(uid: string): Promise<ContinuingStoryItem[]> {
    if (!uid) return [];

    try {
      // 1. Fetch stories collection
      const storiesRef = collection(db, 'stories');
      const q = query(storiesRef, where('status', 'in', ['active', 'developing']), orderBy('lastUpdatedAt', 'desc'));
      const snapshot = await getDocs(q);

      const continuingItems: ContinuingStoryItem[] = [];

      for (const docSnap of snapshot.docs) {
        const storyRecord = { ...docSnap.data(), storyId: docSnap.id } as PlatformStoryRecord;
        const thread = toDomainStoryThread(storyRecord);

        // Check user changes
        const sinceResult = await this.getChangesSinceLastRead(uid, thread.id);
        if (sinceResult.lastReadAt && sinceResult.changes.length > 0) {
          const updates = await this.getUpdates(thread.id);
          if (updates.length > 0) {
            continuingItems.push({
              story: thread,
              updateCount: sinceResult.meaningfulUpdateCount,
              latestUpdate: updates[0],
              lastReadAt: sinceResult.lastReadAt,
            });
          }
        }
      }

      return continuingItems;
    } catch (err) {
      console.warn('[StoryTimelineService] Error fetching continuing stories:', err);
      return [];
    }
  }

  /**
   * Persists a timeline event to Firestore (creator / admin authorization required).
   */
  async saveTimelineEvent(event: PlatformTimelineEventRecord): Promise<void> {
    const eventRef = doc(db, 'stories', event.storyId, 'timeline', event.id);
    await setDoc(eventRef, event, { merge: true });
  }

  /**
   * Persists a story update to Firestore (creator / admin authorization required).
   */
  async saveStoryUpdate(update: PlatformStoryUpdateRecord): Promise<void> {
    const updateRef = doc(db, 'stories', update.storyId, 'updates', update.id);
    await setDoc(updateRef, update, { merge: true });
  }
}

export const storyTimelineService = new StoryTimelineService();
