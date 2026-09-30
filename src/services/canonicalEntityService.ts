import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { PlatformEntityRecord, CanonicalEntity } from '../types/knowledge';
import { toDomainEntity } from './mappers/knowledgeMapper';



// Disambiguation rules for ambiguous entity names
const DISAMBIGUATION_GUARDS: Record<string, { requiredContextWords: string[]; targetEntityId: string }> = {
  'meta': {
    requiredContextWords: ['ai', 'llama', 'zuckerberg', 'facebook', 'model', 'tech', 'platforms', 'open-source'],
    targetEntityId: 'ent_meta',
  },
  'apple': {
    requiredContextWords: ['iphone', 'mac', 'tim cook', 'cupertino', 'ios', 'tech', 'company', 'silicon'],
    targetEntityId: 'ent_apple',
  },
  'tata': {
    requiredContextWords: ['semiconductor', 'fab', 'dholera', 'electronics', 'foundry', 'chips'],
    targetEntityId: 'ent_tata_electronics',
  },
};

export class CanonicalEntityService {
  private entityCache: Map<string, CanonicalEntity> = new Map();

  constructor() {
    // Runtime starts with an empty cache and populates dynamically from Firestore
  }

  /**
   * Fetches all published canonical entities from Firestore into cache.
   */
  async fetchAllEntities(): Promise<CanonicalEntity[]> {
    try {
      const snap = await getDocs(collection(db, 'entities'));
      const entities: CanonicalEntity[] = [];
      snap.forEach(docSnap => {
        const entity = toDomainEntity({ ...(docSnap.data() as PlatformEntityRecord), id: docSnap.id });
        this.entityCache.set(entity.id, entity);
        entities.push(entity);
      });
      return entities;
    } catch (err) {
      console.warn('[CanonicalEntityService] Failed to fetch entities from Firestore:', err);
      return Array.from(this.entityCache.values());
    }
  }

  /**
   * Subscribes to real-time canonical entities in Firestore.
   */
  subscribeToEntities(onData: (entities: CanonicalEntity[]) => void, onError?: (err: Error) => void): () => void {
    return onSnapshot(
      collection(db, 'entities'),
      (snap) => {
        const entities: CanonicalEntity[] = [];
        snap.forEach(docSnap => {
          const entity = toDomainEntity({ ...(docSnap.data() as PlatformEntityRecord), id: docSnap.id });
          this.entityCache.set(entity.id, entity);
          entities.push(entity);
        });
        onData(entities);
      },
      (err) => {
        console.warn('[CanonicalEntityService] Snapshot error:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Returns a canonical entity by ID.
   */
  async getEntity(entityId: string): Promise<CanonicalEntity | null> {
    if (!entityId) return null;
    if (this.entityCache.has(entityId)) {
      return this.entityCache.get(entityId)!;
    }

    try {
      const docRef = doc(db, 'entities', entityId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const entity = toDomainEntity({ ...(snap.data() as PlatformEntityRecord), id: snap.id });
        this.entityCache.set(entityId, entity);
        return entity;
      }
    } catch (err) {
      console.warn(`[CanonicalEntityService] Error fetching entity ${entityId}:`, err);
    }
    return null;
  }

  /**
   * Returns all cached or registered canonical entities.
   */
  getAllCanonicalEntities(): CanonicalEntity[] {
    return Array.from(this.entityCache.values());
  }

  /**
   * Normalizes a raw string alias into a canonical entity ID with disambiguation checks.
   */
  normalizeEntityAlias(rawAlias: string, fullContextText = ''): { entityId: string; confidence: number } | null {
    const cleaned = rawAlias.trim().toLowerCase();
    if (!cleaned) return null;

    // Check disambiguation guards for ambiguous names
    if (DISAMBIGUATION_GUARDS[cleaned]) {
      const guard = DISAMBIGUATION_GUARDS[cleaned];
      const contextLower = fullContextText.toLowerCase();
      const hasContext = guard.requiredContextWords.some(word => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(contextLower);
      });
      if (hasContext) {
        return { entityId: guard.targetEntityId, confidence: 0.95 };
      }
      // Ambiguous without context: reject false merge
      return null;
    }

    // Check canonical entities
    for (const entity of this.entityCache.values()) {
      if (entity.canonicalName.toLowerCase() === cleaned) {
        return { entityId: entity.id, confidence: 1.0 };
      }
      for (const alias of entity.aliases) {
        if (alias.toLowerCase() === cleaned) {
          return { entityId: entity.id, confidence: 0.95 };
        }
      }
    }

    return null;
  }

  /**
   * Extracts all recognized canonical entities from arbitrary text.
   */
  extractCanonicalEntities(text: string): CanonicalEntity[] {
    if (!text) return [];
    const normalizedText = ` ${text.toLowerCase()} `;
    const matched = new Map<string, CanonicalEntity>();

    for (const entity of this.entityCache.values()) {
      // Check disambiguation if entity alias is guarded
      for (const alias of entity.aliases) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');

        if (regex.test(normalizedText)) {
          // Check guard if applicable
          if (DISAMBIGUATION_GUARDS[alias.toLowerCase()]) {
            const guard = DISAMBIGUATION_GUARDS[alias.toLowerCase()];
            const hasContext = guard.requiredContextWords.some(w => {
              const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              return new RegExp(`\\b${esc}\\b`, 'i').test(normalizedText);
            });
            if (!hasContext) continue; // Skip ambiguous match
          }

          matched.set(entity.id, entity);
          break;
        }
      }
    }

    return Array.from(matched.values());
  }

  /**
   * Persists a canonical entity to Firestore (creator/admin authorization required).
   */
  async saveEntity(record: PlatformEntityRecord): Promise<void> {
    const docRef = doc(db, 'entities', record.id);
    await setDoc(docRef, record, { merge: true });
    this.entityCache.set(record.id, toDomainEntity(record));
  }
}

export const canonicalEntityService = new CanonicalEntityService();
