import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  UserKnowledge,
  PlatformUserKnowledgeRecord,
  UserTrailProgress,
  PlatformUserTrailProgressRecord,
  KnowledgeSignal,
} from '../types/knowledge';
import {
  toDomainUserKnowledge,
  toTransportUserKnowledge,
  toDomainUserTrailProgress,
  toTransportUserTrailProgress,
} from './mappers/userKnowledgeMapper';
import {
  reduceKnowledgeState,
  createInitialUserKnowledge,
} from './knowledgeStateReducer';

export class UserKnowledgeService {
  private knowledgeCache: Map<string, Map<string, UserKnowledge>> = new Map(); // userId -> (conceptId -> state)
  private trailCache: Map<string, Map<string, UserTrailProgress>> = new Map(); // userId -> (trailId -> progress)

  private getUserCache(userId: string): Map<string, UserKnowledge> {
    if (!this.knowledgeCache.has(userId)) {
      this.knowledgeCache.set(userId, new Map());
    }
    return this.knowledgeCache.get(userId)!;
  }

  private getUserTrailCache(userId: string): Map<string, UserTrailProgress> {
    if (!this.trailCache.has(userId)) {
      this.trailCache.set(userId, new Map());
    }
    return this.trailCache.get(userId)!;
  }

  /**
   * Fetches the user's familiarity state for a specific concept.
   */
  async getConceptState(userId: string, conceptId: string): Promise<UserKnowledge> {
    if (!userId || !conceptId) {
      return createInitialUserKnowledge(conceptId);
    }

    const cache = this.getUserCache(userId);
    if (cache.has(conceptId)) {
      return cache.get(conceptId)!;
    }

    try {
      const docRef = doc(db, 'users', userId, 'knowledge', conceptId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const state = toDomainUserKnowledge({
          ...(snap.data() as PlatformUserKnowledgeRecord),
          conceptId: snap.id,
        });
        cache.set(conceptId, state);
        return state;
      }
    } catch (err) {
      console.warn(`[UserKnowledgeService] Failed to fetch concept ${conceptId} for user ${userId}:`, err);
    }

    const initial = createInitialUserKnowledge(conceptId);
    cache.set(conceptId, initial);
    return initial;
  }

  /**
   * Fetches multiple concept states in parallel.
   */
  async getMultipleConceptStates(
    userId: string,
    conceptIds: string[]
  ): Promise<Record<string, UserKnowledge>> {
    const result: Record<string, UserKnowledge> = {};
    if (!userId || !conceptIds.length) return result;

    await Promise.all(
      conceptIds.map(async (cid) => {
        result[cid] = await this.getConceptState(userId, cid);
      })
    );

    return result;
  }

  /**
   * Subscribes to real-time updates for a specific user concept state.
   */
  subscribeToConceptState(
    userId: string,
    conceptId: string,
    onData: (state: UserKnowledge) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!userId || !conceptId) {
      onData(createInitialUserKnowledge(conceptId));
      return () => {};
    }

    const docRef = doc(db, 'users', userId, 'knowledge', conceptId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const state = toDomainUserKnowledge({
            ...(snap.data() as PlatformUserKnowledgeRecord),
            conceptId: snap.id,
          });
          this.getUserCache(userId).set(conceptId, state);
          onData(state);
        } else {
          const initial = createInitialUserKnowledge(conceptId);
          this.getUserCache(userId).set(conceptId, initial);
          onData(initial);
        }
      },
      (error) => {
        console.warn(`[UserKnowledgeService] Snapshot error on concept ${conceptId}:`, error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Subscribes to all concept states for a user.
   */
  subscribeToAllConceptStates(
    userId: string,
    onData: (states: Record<string, UserKnowledge>) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!userId) {
      onData({});
      return () => {};
    }

    const colRef = collection(db, 'users', userId, 'knowledge');
    return onSnapshot(
      colRef,
      (snap) => {
        const states: Record<string, UserKnowledge> = {};
        const cache = this.getUserCache(userId);
        snap.forEach((d) => {
          const state = toDomainUserKnowledge({
            ...(d.data() as PlatformUserKnowledgeRecord),
            conceptId: d.id,
          });
          cache.set(d.id, state);
          states[d.id] = state;
        });
        onData(states);
      },
      (error) => {
        console.warn('[UserKnowledgeService] Snapshot error on all concepts:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Fetches all concept states for a user.
   */
  async getAllUserKnowledge(userId: string): Promise<UserKnowledge[]> {
    if (!userId) return [];
    try {
      const colRef = collection(db, 'users', userId, 'knowledge');
      const snap = await getDocs(colRef);
      const list: UserKnowledge[] = [];
      const cache = this.getUserCache(userId);
      snap.forEach((d) => {
        const state = toDomainUserKnowledge({
          ...(d.data() as PlatformUserKnowledgeRecord),
          conceptId: d.id,
        });
        cache.set(d.id, state);
        list.push(state);
      });
      return list;
    } catch (err) {
      console.warn(`[UserKnowledgeService] Error fetching all knowledge for ${userId}:`, err);
      return [];
    }
  }

  /**
   * Fetches all trail progress records for a user.
   */
  async getAllUserTrailProgress(userId: string): Promise<UserTrailProgress[]> {
    if (!userId) return [];
    try {
      const colRef = collection(db, 'users', userId, 'trailProgress');
      const snap = await getDocs(colRef);
      const list: UserTrailProgress[] = [];
      const cache = this.getUserTrailCache(userId);
      snap.forEach((d) => {
        const prog = toDomainUserTrailProgress({
          ...(d.data() as PlatformUserTrailProgressRecord),
          trailId: d.id,
        });
        cache.set(d.id, prog);
        list.push(prog);
      });
      return list;
    } catch (err) {
      console.warn(`[UserKnowledgeService] Error fetching all trail progress for ${userId}:`, err);
      return [];
    }
  }

  /**
   * Applies an interaction signal and persists the updated deterministic state.
   */
  async applySignal(userId: string, signal: KnowledgeSignal): Promise<UserKnowledge> {
    if (!userId || !signal.conceptId) {
      return createInitialUserKnowledge(signal.conceptId);
    }

    const currentState = await this.getConceptState(userId, signal.conceptId);
    const updatedState = reduceKnowledgeState(currentState, signal);

    this.getUserCache(userId).set(signal.conceptId, updatedState);

    try {
      const docRef = doc(db, 'users', userId, 'knowledge', signal.conceptId);
      await setDoc(docRef, toTransportUserKnowledge(updatedState), { merge: true });
    } catch (err) {
      console.warn(`[UserKnowledgeService] Failed to persist signal for ${signal.conceptId}:`, err);
    }

    return updatedState;
  }

  /**
   * Explicit user override: "I already know this"
   */
  async markKnown(userId: string, conceptId: string): Promise<UserKnowledge> {
    return this.applySignal(userId, {
      type: 'USER_KNOWS_CONCEPT',
      conceptId,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * Explicit user request: "Explain from basics"
   */
  async requestBasics(userId: string, conceptId: string): Promise<UserKnowledge> {
    return this.applySignal(userId, {
      type: 'USER_REQUESTS_BASICS',
      conceptId,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * Resets familiarity state for a specific concept.
   */
  async resetConceptState(userId: string, conceptId: string): Promise<void> {
    if (!userId || !conceptId) return;

    this.getUserCache(userId).delete(conceptId);
    try {
      const docRef = doc(db, 'users', userId, 'knowledge', conceptId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`[UserKnowledgeService] Error resetting concept ${conceptId}:`, err);
    }
  }

  /**
   * Resets all user knowledge documents.
   */
  async resetAllKnowledge(userId: string): Promise<void> {
    if (!userId) return;

    this.knowledgeCache.delete(userId);
    try {
      const colRef = collection(db, 'users', userId, 'knowledge');
      const snap = await getDocs(colRef);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.warn(`[UserKnowledgeService] Error resetting all knowledge for ${userId}:`, err);
    }
  }

  // ==========================================
  // KNOWLEDGE TRAIL PROGRESS
  // ==========================================

  /**
   * Fetches active trail progress.
   */
  async getTrailProgress(userId: string, trailId: string): Promise<UserTrailProgress | null> {
    if (!userId || !trailId) return null;

    const cache = this.getUserTrailCache(userId);
    if (cache.has(trailId)) {
      return cache.get(trailId)!;
    }

    try {
      const docRef = doc(db, 'users', userId, 'trailProgress', trailId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const progress = toDomainUserTrailProgress({
          ...(snap.data() as PlatformUserTrailProgressRecord),
          trailId: snap.id,
        });
        cache.set(trailId, progress);
        return progress;
      }
    } catch (err) {
      console.warn(`[UserKnowledgeService] Failed to fetch trail progress for ${trailId}:`, err);
    }

    return null;
  }

  /**
   * Subscribes to real-time trail progress.
   */
  subscribeToTrailProgress(
    userId: string,
    trailId: string,
    onData: (progress: UserTrailProgress | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!userId || !trailId) {
      onData(null);
      return () => {};
    }

    const docRef = doc(db, 'users', userId, 'trailProgress', trailId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const progress = toDomainUserTrailProgress({
            ...(snap.data() as PlatformUserTrailProgressRecord),
            trailId: snap.id,
          });
          this.getUserTrailCache(userId).set(trailId, progress);
          onData(progress);
        } else {
          onData(null);
        }
      },
      (error) => {
        console.warn(`[UserKnowledgeService] Snapshot error on trail ${trailId}:`, error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Updates trail step progress and dispatches associated knowledge signals.
   */
  async updateTrailProgress(
    userId: string,
    trailId: string,
    stepNumber: number,
    completedConceptId?: string,
    isFinalStep = false
  ): Promise<UserTrailProgress> {
    const now = new Date().toISOString();
    const existing = await this.getTrailProgress(userId, trailId);

    const completedStepIds = existing?.completedStepIds ? [...existing.completedStepIds] : [];
    if (completedConceptId && !completedStepIds.includes(completedConceptId)) {
      completedStepIds.push(completedConceptId);
    }

    const updated: UserTrailProgress = {
      trailId,
      currentStep: stepNumber,
      completedStepIds,
      startedAt: existing?.startedAt || now,
      lastInteractedAt: now,
      completedAt: isFinalStep ? now : existing?.completedAt || null,
      updatedAt: now,
    };

    this.getUserTrailCache(userId).set(trailId, updated);

    try {
      const docRef = doc(db, 'users', userId, 'trailProgress', trailId);
      await setDoc(docRef, toTransportUserTrailProgress(updated), { merge: true });
    } catch (err) {
      console.warn(`[UserKnowledgeService] Error persisting trail progress for ${trailId}:`, err);
    }

    // Dispatch step completed signal for the concept
    if (completedConceptId) {
      await this.applySignal(userId, {
        type: 'TRAIL_STEP_COMPLETED',
        conceptId: completedConceptId,
        sourceTrailId: trailId,
        occurredAt: now,
      });
    }

    // Dispatch trail completed signal if final
    if (isFinalStep) {
      for (const cid of completedStepIds) {
        await this.applySignal(userId, {
          type: 'TRAIL_COMPLETED',
          conceptId: cid,
          sourceTrailId: trailId,
          occurredAt: now,
        });
      }
    }

    return updated;
  }
}

export const userKnowledgeService = new UserKnowledgeService();
