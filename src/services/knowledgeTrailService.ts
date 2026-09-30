import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type {
  PlatformKnowledgeTrailRecord,
  KnowledgeTrail,
} from '../types/knowledge';
import { toDomainKnowledgeTrail } from './mappers/knowledgeMapper';
import { canonicalConceptService } from './canonicalConceptService';

export class KnowledgeTrailService {
  private trailCache: Map<string, KnowledgeTrail> = new Map();

  constructor() {
    // Runtime starts with an empty cache and populates dynamically from Firestore
  }

  /**
   * Fetches all published canonical knowledge trails from Firestore into cache.
   */
  async fetchAllTrails(): Promise<KnowledgeTrail[]> {
    try {
      const q = query(collection(db, 'knowledgeTrails'), where('status', '==', 'published'));
      const snap = await getDocs(q);
      const trails: KnowledgeTrail[] = [];
      snap.forEach(docSnap => {
        const trail = toDomainKnowledgeTrail({ ...(docSnap.data() as PlatformKnowledgeTrailRecord), id: docSnap.id });
        this.trailCache.set(trail.id, trail);
        trails.push(trail);
      });
      return trails;
    } catch (err) {
      console.warn('[KnowledgeTrailService] Failed to fetch trails from Firestore:', err);
      return Array.from(this.trailCache.values());
    }
  }

  /**
   * Subscribes to real-time published knowledge trails in Firestore.
   */
  subscribeToTrails(onData: (trails: KnowledgeTrail[]) => void, onError?: (err: Error) => void): () => void {
    const q = query(collection(db, 'knowledgeTrails'), where('status', '==', 'published'));
    return onSnapshot(
      q,
      (snap) => {
        const trails: KnowledgeTrail[] = [];
        snap.forEach(docSnap => {
          const trail = toDomainKnowledgeTrail({ ...(docSnap.data() as PlatformKnowledgeTrailRecord), id: docSnap.id });
          this.trailCache.set(trail.id, trail);
          trails.push(trail);
        });
        onData(trails);
      },
      (err) => {
        console.warn('[KnowledgeTrailService] Snapshot error:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Retrieves a knowledge trail by ID.
   */
  async getTrail(trailId: string): Promise<KnowledgeTrail | null> {
    if (!trailId) return null;
    if (this.trailCache.has(trailId)) {
      return this.trailCache.get(trailId)!;
    }

    try {
      const docRef = doc(db, 'knowledgeTrails', trailId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const trail = toDomainKnowledgeTrail({ ...(snap.data() as PlatformKnowledgeTrailRecord), id: snap.id });
        this.trailCache.set(trailId, trail);
        return trail;
      }
    } catch (err) {
      console.warn(`[KnowledgeTrailService] Error fetching trail ${trailId}:`, err);
    }
    return null;
  }

  /**
   * Retrieves all published knowledge trails that start with or contain a specific concept.
   */
  async getTrailsForConcept(conceptId: string): Promise<KnowledgeTrail[]> {
    if (!conceptId) return [];
    return Array.from(this.trailCache.values()).filter(
      trail => trail.entryConceptId === conceptId || trail.steps.some(s => s.conceptId === conceptId)
    );
  }

  /**
   * Retrieves all cached canonical knowledge trails.
   */
  getAllKnowledgeTrails(): KnowledgeTrail[] {
    return Array.from(this.trailCache.values());
  }

  /**
   * Retrieves recommended knowledge trails relevant to a story's concepts.
   */
  async getTrailsForStory(storyId: string, conceptIds: string[]): Promise<KnowledgeTrail[]> {
    const conceptSet = new Set(conceptIds);
    const trails: KnowledgeTrail[] = [];

    for (const trail of this.trailCache.values()) {
      if (trail.relatedStoryIds.includes(storyId) || conceptSet.has(trail.entryConceptId)) {
        trails.push(trail);
      } else if (trail.steps.some(s => conceptSet.has(s.conceptId))) {
        trails.push(trail);
      }
    }

    return trails;
  }

  /**
   * Validates a Knowledge Trail against pedagogical quality rules:
   * 1. 2 to 6 steps
   * 2. No duplicate concepts within the trail
   * 3. No circular cycles
   * 4. All concept IDs must exist
   */
  validateTrail(trail: KnowledgeTrail): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!trail.title || trail.title.trim().length < 5) {
      errors.push('Trail title is too short or missing');
    }

    if (trail.steps.length < 2 || trail.steps.length > 6) {
      errors.push(`Trail length (${trail.steps.length}) must be between 2 and 6 steps`);
    }

    const seenConceptIds = new Set<string>();
    for (let i = 0; i < trail.steps.length; i++) {
      const step = trail.steps[i];
      if (!step.conceptId) {
        errors.push(`Step ${i + 1} is missing conceptId`);
        continue;
      }

      if (seenConceptIds.has(step.conceptId)) {
        errors.push(`Duplicate concept detected at step ${i + 1}: ${step.conceptId}`);
      }
      seenConceptIds.add(step.conceptId);

      // Check if concept exists in registry
      const exists = canonicalConceptService.getAllCanonicalConcepts().some(c => c.id === step.conceptId);
      if (!exists) {
        errors.push(`Step ${i + 1} references non-existent canonical concept: ${step.conceptId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Persists a knowledge trail to Firestore.
   */
  async saveTrail(record: PlatformKnowledgeTrailRecord): Promise<void> {
    const domain = toDomainKnowledgeTrail(record);
    const check = this.validateTrail(domain);
    if (!check.valid) {
      throw new Error(`Invalid knowledge trail: ${check.errors.join(', ')}`);
    }

    const docRef = doc(db, 'knowledgeTrails', record.id);
    await setDoc(docRef, record, { merge: true });
    this.trailCache.set(record.id, domain);
  }
}

export const knowledgeTrailService = new KnowledgeTrailService();
