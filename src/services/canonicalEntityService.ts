import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { PlatformEntityRecord, CanonicalEntity, EntityType } from '../types/knowledge';
import { toDomainEntity } from './mappers/knowledgeMapper';

// Seed dictionary of authoritative canonical entities
export const SEED_CANONICAL_ENTITIES: Record<string, {
  id: string;
  canonicalName: string;
  type: EntityType;
  aliases: string[];
  shortDescription: string;
  externalIds?: { wikidata?: string; officialUrl?: string };
}> = {
  'ent_isro': {
    id: 'ent_isro',
    canonicalName: 'Indian Space Research Organisation',
    type: 'organization',
    aliases: ['isro', 'indian space research organisation', 'indian space agency', 'isro india'],
    shortDescription: 'The national space agency of India, responsible for space-based research and launch vehicle development.',
    externalIds: { officialUrl: 'https://www.isro.gov.in' },
  },
  'ent_rbi': {
    id: 'ent_rbi',
    canonicalName: 'Reserve Bank of India',
    type: 'government_body',
    aliases: ['rbi', 'reserve bank of india', 'central bank of india', 'indian central bank'],
    shortDescription: "India's central bank and regulatory authority for banking and monetary policy.",
    externalIds: { officialUrl: 'https://www.rbi.org.in' },
  },
  'ent_nvidia': {
    id: 'ent_nvidia',
    canonicalName: 'NVIDIA Corporation',
    type: 'company',
    aliases: ['nvidia', 'nvidia corp', 'nvidia corporation', 'jensen huang'],
    shortDescription: 'A global technology company that designs graphics processing units (GPUs) and AI computing platforms.',
    externalIds: { officialUrl: 'https://www.nvidia.com' },
  },
  'ent_openai': {
    id: 'ent_openai',
    canonicalName: 'OpenAI',
    type: 'company',
    aliases: ['openai', 'openai inc', 'chatgpt', 'sam altman'],
    shortDescription: 'An artificial intelligence research and deployment company that develops large language models.',
    externalIds: { officialUrl: 'https://openai.com' },
  },
  'ent_ather_energy': {
    id: 'ent_ather_energy',
    canonicalName: 'Ather Energy',
    type: 'company',
    aliases: ['ather', 'ather energy', 'ather electric', 'tarun mehta'],
    shortDescription: 'An Indian electric vehicle manufacturer known for smart electric scooters and fast-charging grid infrastructure.',
    externalIds: { officialUrl: 'https://www.atherenergy.com' },
  },
  'ent_vigyanlabs': {
    id: 'ent_vigyanlabs',
    canonicalName: 'Vigyanlabs Innovations',
    type: 'company',
    aliases: ['vigyanlabs', 'vigyanlabs innovations', 'vigyanlabs india'],
    shortDescription: 'A Mysuru-based clean-tech and sovereign computing company developing waterless-cooled AI hardware (FEMTO).',
    externalIds: { officialUrl: 'https://www.vigyanlabs.com' },
  },
  'ent_npci': {
    id: 'ent_npci',
    canonicalName: 'National Payments Corporation of India',
    type: 'organization',
    aliases: ['npci', 'national payments corporation of india', 'national payments corp'],
    shortDescription: 'An umbrella organization for operating retail payments and settlement systems in India, including UPI.',
    externalIds: { officialUrl: 'https://www.npci.org.in' },
  },
  'ent_tata_electronics': {
    id: 'ent_tata_electronics',
    canonicalName: 'Tata Electronics',
    type: 'company',
    aliases: ['tata electronics', 'tata semiconductor', 'tata electronics private limited', 'tata'],
    shortDescription: 'A Tata Group enterprise leading semiconductor fabrication in Dholera and electronics manufacturing.',
    externalIds: { officialUrl: 'https://www.tata.com' },
  },
  'ent_apple': {
    id: 'ent_apple',
    canonicalName: 'Apple Inc.',
    type: 'company',
    aliases: ['apple', 'apple inc', 'tim cook', 'cupertino'],
    shortDescription: 'A global technology company that designs consumer electronics, software, and custom silicon processors.',
    externalIds: { officialUrl: 'https://www.apple.com' },
  },
  'ent_tsmc': {
    id: 'ent_tsmc',
    canonicalName: 'Taiwan Semiconductor Manufacturing Company',
    type: 'company',
    aliases: ['tsmc', 'taiwan semiconductor', 'taiwan semiconductor manufacturing company'],
    shortDescription: 'The world’s largest dedicated semiconductor foundry, partnering with Tata Electronics for Dholera.',
    externalIds: { officialUrl: 'https://www.tsmc.com' },
  },
  'ent_cdac': {
    id: 'ent_cdac',
    canonicalName: 'Centre for Development of Advanced Computing',
    type: 'institution',
    aliases: ['c-dac', 'cdac', 'centre for development of advanced computing'],
    shortDescription: 'An autonomous R&D institution under MeitY developing sovereign supercomputing and AI architectures.',
    externalIds: { officialUrl: 'https://www.cdac.in' },
  },
  'ent_fuel_cycle': {
    id: 'ent_fuel_cycle',
    canonicalName: 'Fuel Cycle',
    type: 'company',
    aliases: ['fuel cycle', 'fuel cycle inc', 'fuelcycle'],
    shortDescription: 'A market research and intelligence platform that expanded engineering GCC hubs across India.',
    externalIds: { officialUrl: 'https://www.fuelcycle.com' },
  },
  'ent_meity': {
    id: 'ent_meity',
    canonicalName: 'Ministry of Electronics and Information Technology',
    type: 'government_body',
    aliases: ['meity', 'ministry of electronics and information technology', 'ministry of it india'],
    shortDescription: "An executive agency of the Union Government of India responsible for IT policy and the IndiaAI mission.",
    externalIds: { officialUrl: 'https://www.meity.gov.in' },
  },
  'ent_sebi': {
    id: 'ent_sebi',
    canonicalName: 'Securities and Exchange Board of India',
    type: 'government_body',
    aliases: ['sebi', 'securities and exchange board of india', 'indian securities regulator'],
    shortDescription: 'The regulatory body for securities and commodity markets in India.',
    externalIds: { officialUrl: 'https://www.sebi.gov.in' },
  },
  'ent_brics': {
    id: 'ent_brics',
    canonicalName: 'BRICS',
    type: 'organization',
    aliases: ['brics', 'brics alliance', 'brics group'],
    shortDescription: 'An intergovernmental organization comprising emerging national economies including Brazil, Russia, India, China, and South Africa.',
  },
  'ent_sarvam_ai': {
    id: 'ent_sarvam_ai',
    canonicalName: 'Sarvam AI',
    type: 'company',
    aliases: ['sarvam', 'sarvam ai', 'sarvam.ai'],
    shortDescription: 'An Indian frontier AI research startup building foundational Indic language models and speech systems.',
    externalIds: { officialUrl: 'https://www.sarvam.ai' },
  },
  'ent_salesforce': {
    id: 'ent_salesforce',
    canonicalName: 'Salesforce',
    type: 'company',
    aliases: ['salesforce', 'salesforce.com', 'marc benioff'],
    shortDescription: 'A global cloud enterprise software company pioneering autonomous AI agents with Agentforce.',
    externalIds: { officialUrl: 'https://www.salesforce.com' },
  },
  'ent_google': {
    id: 'ent_google',
    canonicalName: 'Google',
    type: 'company',
    aliases: ['google', 'google cloud', 'alphabet inc', 'sundar pichai', 'deepmind'],
    shortDescription: 'A multinational technology company focusing on search, AI, cloud computing, and software.',
    externalIds: { officialUrl: 'https://www.google.com' },
  },
  'ent_meta': {
    id: 'ent_meta',
    canonicalName: 'Meta Platforms',
    type: 'company',
    aliases: ['meta', 'meta platforms', 'facebook inc', 'mark zuckerberg'],
    shortDescription: 'A multinational technology conglomerate developing open-weight Llama AI models and social platforms.',
    externalIds: { officialUrl: 'https://about.meta.com' },
  },
  'ent_loc_bengaluru': {
    id: 'ent_loc_bengaluru',
    canonicalName: 'Bengaluru',
    type: 'place',
    aliases: ['bengaluru', 'bangalore', 'silicon valley of india'],
    shortDescription: 'The capital of Karnataka and India’s primary high-tech and startup hub.',
  },
  'ent_loc_hyderabad': {
    id: 'ent_loc_hyderabad',
    canonicalName: 'Hyderabad',
    type: 'place',
    aliases: ['hyderabad', 'cyberabad', 'telangana capital'],
    shortDescription: 'A major Indian IT, pharmaceutical, and technology engineering centre in Telangana.',
  },
  'ent_loc_navi_mumbai': {
    id: 'ent_loc_navi_mumbai',
    canonicalName: 'Navi Mumbai',
    type: 'place',
    aliases: ['navi mumbai', 'new mumbai'],
    shortDescription: 'A planned satellite city of Mumbai, hosting enterprise data centres and Global Capability Centres.',
  },
  'ent_loc_pune': {
    id: 'ent_loc_pune',
    canonicalName: 'Pune',
    type: 'place',
    aliases: ['pune', 'poona'],
    shortDescription: 'A prominent manufacturing, automotive EV powertrain, and software engineering hub in Maharashtra.',
  },
  'ent_loc_dholera': {
    id: 'ent_loc_dholera',
    canonicalName: 'Dholera',
    type: 'place',
    aliases: ['dholera', 'dholera special investment region', 'dholera sir'],
    shortDescription: 'A planned smart city in Gujarat home to India’s first commercial semiconductor fab.',
  },
};

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
    this.initCacheFromSeeds();
  }

  private initCacheFromSeeds() {
    for (const [id, entity] of Object.entries(SEED_CANONICAL_ENTITIES)) {
      this.entityCache.set(id, {
        id: entity.id,
        canonicalName: entity.canonicalName,
        type: entity.type,
        aliases: entity.aliases,
        shortDescription: entity.shortDescription,
        externalIds: entity.externalIds,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      });
    }
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
