import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { PlatformConceptRecord, CanonicalConcept } from '../types/knowledge';
import { toDomainConcept } from './mappers/knowledgeMapper';



export class CanonicalConceptService {
  private conceptCache: Map<string, CanonicalConcept> = new Map();

  constructor() {
    // Runtime starts with an empty cache and populates dynamically from Firestore
  }

  /**
   * Fetches all published canonical concepts from Firestore into cache.
   */
  async fetchAllConcepts(): Promise<CanonicalConcept[]> {
    try {
      const snap = await getDocs(collection(db, 'concepts'));
      const concepts: CanonicalConcept[] = [];
      snap.forEach(docSnap => {
        const concept = toDomainConcept({ ...(docSnap.data() as PlatformConceptRecord), id: docSnap.id });
        this.conceptCache.set(concept.id, concept);
        concepts.push(concept);
      });
      return concepts;
    } catch (err) {
      console.warn('[CanonicalConceptService] Failed to fetch concepts from Firestore:', err);
      return Array.from(this.conceptCache.values());
    }
  }

  /**
   * Subscribes to real-time canonical concepts in Firestore.
   */
  subscribeToConcepts(onData: (concepts: CanonicalConcept[]) => void, onError?: (err: Error) => void): () => void {
    return onSnapshot(
      collection(db, 'concepts'),
      (snap) => {
        const concepts: CanonicalConcept[] = [];
        snap.forEach(docSnap => {
          const concept = toDomainConcept({ ...(docSnap.data() as PlatformConceptRecord), id: docSnap.id });
          this.conceptCache.set(concept.id, concept);
          concepts.push(concept);
        });
        onData(concepts);
      },
      (err) => {
        console.warn('[CanonicalConceptService] Snapshot error:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Returns a canonical concept by ID.
   */
  async getConcept(conceptId: string): Promise<CanonicalConcept | null> {
    if (!conceptId) return null;
    if (this.conceptCache.has(conceptId)) {
      return this.conceptCache.get(conceptId)!;
    }

    try {
      const docRef = doc(db, 'concepts', conceptId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const concept = toDomainConcept({ ...(snap.data() as PlatformConceptRecord), id: snap.id });
        this.conceptCache.set(conceptId, concept);
        return concept;
      }
    } catch (err) {
      console.warn(`[CanonicalConceptService] Error fetching concept ${conceptId}:`, err);
    }
    return null;
  }

  /**
   * Returns all cached canonical concepts.
   */
  getAllCanonicalConcepts(): CanonicalConcept[] {
    return Array.from(this.conceptCache.values());
  }

  /**
   * Extracts recognized canonical concepts from arbitrary text.
   */
  extractCanonicalConcepts(text: string): CanonicalConcept[] {
    if (!text) return [];
    const normalizedText = ` ${text.toLowerCase()} `;
    const matched = new Map<string, CanonicalConcept>();

    for (const concept of this.conceptCache.values()) {
      for (const alias of concept.aliases) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');

        if (regex.test(normalizedText)) {
          matched.set(concept.id, concept);
          break;
        }
      }
    }

    return Array.from(matched.values());
  }

  /**
   * Persists a canonical concept to Firestore.
   */
  async saveConcept(record: PlatformConceptRecord): Promise<void> {
    const docRef = doc(db, 'concepts', record.id);
    await setDoc(docRef, record, { merge: true });
    this.conceptCache.set(record.id, toDomainConcept(record));
  }
}

export const canonicalConceptService = new CanonicalConceptService();
