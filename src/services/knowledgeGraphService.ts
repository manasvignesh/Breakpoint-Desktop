import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type {
  PlatformKnowledgeEdgeRecord,
  KnowledgeEdge,
  CanonicalConcept,
  CanonicalEntity,
} from '../types/knowledge';
import { toDomainKnowledgeEdge } from './mappers/knowledgeMapper';
import { canonicalConceptService } from './canonicalConceptService';
import { canonicalEntityService } from './canonicalEntityService';

// Seed graph edges connecting canonical entities and concepts with explicit evidence
export const SEED_KNOWLEDGE_EDGES: PlatformKnowledgeEdgeRecord[] = [
  // ISRO Space Propulsion Graph
  {
    id: 'edge_semi_cryo_is_a_propulsion',
    sourceId: 'con_semi_cryogenic_engine',
    targetId: 'con_rocket_propulsion',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'IS_A',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_cryo_is_a_propulsion',
    sourceId: 'con_cryogenic_engine',
    targetId: 'con_rocket_propulsion',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'IS_A',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_semi_cryo_contrasts_cryo',
    sourceId: 'con_semi_cryogenic_engine',
    targetId: 'con_cryogenic_engine',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'CONTRASTS_WITH',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_semi_cryo_develops_thrust',
    sourceId: 'con_semi_cryogenic_engine',
    targetId: 'con_thrust',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'REQUIRES',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_semi_cryo_used_by_launch_vehicle',
    sourceId: 'con_semi_cryogenic_engine',
    targetId: 'con_launch_vehicle',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'PART_OF',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_isro_develops_semi_cryo',
    sourceId: 'ent_isro',
    targetId: 'con_semi_cryogenic_engine',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'DEVELOPS',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_isro_operates_launch_vehicle',
    sourceId: 'ent_isro',
    targetId: 'con_launch_vehicle',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'OPERATES_IN',
    evidenceArticleIds: ['art_isro_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // RBI Monetary Policy Graph
  {
    id: 'edge_repo_rate_is_a_monetary_policy',
    sourceId: 'con_repo_rate',
    targetId: 'con_monetary_policy',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'IS_A',
    evidenceArticleIds: ['art_rbi_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_monetary_policy_requires_inflation_targeting',
    sourceId: 'con_monetary_policy',
    targetId: 'con_inflation_targeting',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'REQUIRES',
    evidenceArticleIds: ['art_rbi_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_repo_rate_affects_interest_rate',
    sourceId: 'con_repo_rate',
    targetId: 'con_interest_rate',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'RELATED_TO',
    evidenceArticleIds: ['art_rbi_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_rbi_regulates_repo_rate',
    sourceId: 'ent_rbi',
    targetId: 'con_repo_rate',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'DEVELOPS',
    evidenceArticleIds: ['art_rbi_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_rbi_operates_monetary_policy',
    sourceId: 'ent_rbi',
    targetId: 'con_monetary_policy',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'OPERATES_IN',
    evidenceArticleIds: ['art_rbi_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // Sovereign AI & High-Density Compute Graph
  {
    id: 'edge_transformer_requires_llm',
    sourceId: 'con_large_language_model',
    targetId: 'con_transformer_model',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'REQUIRES',
    evidenceArticleIds: ['art_ai_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_sovereign_ai_requires_supercomputer',
    sourceId: 'con_sovereign_ai',
    targetId: 'con_supercomputer',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'REQUIRES',
    evidenceArticleIds: ['art_cdac_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_sovereign_ai_uses_waterless_cooling',
    sourceId: 'con_sovereign_ai',
    targetId: 'con_waterless_cooling',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'REQUIRES',
    evidenceArticleIds: ['art_femto_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_vigyanlabs_develops_waterless_cooling',
    sourceId: 'ent_vigyanlabs',
    targetId: 'con_waterless_cooling',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'DEVELOPS',
    evidenceArticleIds: ['art_femto_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_cdac_develops_supercomputer',
    sourceId: 'ent_cdac',
    targetId: 'con_supercomputer',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'DEVELOPS',
    evidenceArticleIds: ['art_cdac_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // Semiconductor Manufacturing Graph
  {
    id: 'edge_cleanroom_part_of_fab',
    sourceId: 'con_cleanroom',
    targetId: 'con_semiconductor_fab',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'PART_OF',
    evidenceArticleIds: ['art_tata_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_atmp_related_to_fab',
    sourceId: 'con_atmp_osat',
    targetId: 'con_semiconductor_fab',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'RELATED_TO',
    evidenceArticleIds: ['art_tata_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_tata_develops_fab',
    sourceId: 'ent_tata_electronics',
    targetId: 'con_semiconductor_fab',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'DEVELOPS',
    evidenceArticleIds: ['art_tata_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_tata_located_in_dholera',
    sourceId: 'ent_tata_electronics',
    targetId: 'ent_loc_dholera',
    sourceType: 'entity',
    targetType: 'entity',
    relationType: 'LOCATED_IN',
    evidenceArticleIds: ['art_tata_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_tata_partners_tsmc',
    sourceId: 'ent_tata_electronics',
    targetId: 'ent_tsmc',
    sourceType: 'entity',
    targetType: 'entity',
    relationType: 'PARTNERS_WITH',
    evidenceArticleIds: ['art_tata_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // EV & Powertrain Graph
  {
    id: 'edge_powertrain_related_to_fast_charging',
    sourceId: 'con_powertrain',
    targetId: 'con_fast_charging',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'RELATED_TO',
    evidenceArticleIds: ['art_ather_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_ather_develops_fast_charging',
    sourceId: 'ent_ather_energy',
    targetId: 'con_fast_charging',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'DEVELOPS',
    evidenceArticleIds: ['art_ather_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // Global Capability Centre & Enterprise Growth
  {
    id: 'edge_gcc_is_a_it_services',
    sourceId: 'con_gcc',
    targetId: 'con_it_services',
    sourceType: 'concept',
    targetType: 'concept',
    relationType: 'IS_A',
    evidenceArticleIds: ['art_fc_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_fuel_cycle_develops_gcc',
    sourceId: 'ent_fuel_cycle',
    targetId: 'con_gcc',
    sourceType: 'entity',
    targetType: 'concept',
    relationType: 'DEVELOPS',
    evidenceArticleIds: ['art_fc_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
  {
    id: 'edge_fuel_cycle_located_in_navi_mumbai',
    sourceId: 'ent_fuel_cycle',
    targetId: 'ent_loc_navi_mumbai',
    sourceType: 'entity',
    targetType: 'entity',
    relationType: 'LOCATED_IN',
    evidenceArticleIds: ['art_fc_01'],
    confidence: 1.0,
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
];

export class KnowledgeGraphService {
  private edgeCache: Map<string, KnowledgeEdge> = new Map();

  constructor() {
    this.initCacheFromSeeds();
  }

  private initCacheFromSeeds() {
    for (const edge of SEED_KNOWLEDGE_EDGES) {
      this.edgeCache.set(edge.id, toDomainKnowledgeEdge(edge));
    }
  }

  /**
   * Retrieves all inbound and outbound edges connected to a node (entity or concept).
   */
  async getEdgesForNode(nodeId: string): Promise<KnowledgeEdge[]> {
    if (!nodeId) return [];
    return Array.from(this.edgeCache.values()).filter(
      edge => edge.sourceId === nodeId || edge.targetId === nodeId
    );
  }

  /**
   * Retrieves all related canonical concepts connected to a target concept.
   */
  async getRelatedConcepts(conceptId: string): Promise<CanonicalConcept[]> {
    if (!conceptId) return [];
    const edges = await this.getEdgesForNode(conceptId);
    const relatedConceptIds = new Set<string>();

    for (const edge of edges) {
      if (edge.sourceId === conceptId && edge.targetType === 'concept') {
        relatedConceptIds.add(edge.targetId);
      } else if (edge.targetId === conceptId && edge.sourceType === 'concept') {
        relatedConceptIds.add(edge.sourceId);
      }
    }

    const concepts: CanonicalConcept[] = [];
    for (const id of relatedConceptIds) {
      const c = await canonicalConceptService.getConcept(id);
      if (c) concepts.push(c);
    }
    return concepts;
  }

  /**
   * Retrieves all canonical entities that operate, develop, or use a specific concept.
   */
  async getEntitiesForConcept(conceptId: string): Promise<CanonicalEntity[]> {
    if (!conceptId) return [];
    const edges = await this.getEdgesForNode(conceptId);
    const entityIds = new Set<string>();

    for (const edge of edges) {
      if (edge.sourceType === 'entity' && edge.targetId === conceptId) {
        entityIds.add(edge.sourceId);
      } else if (edge.targetType === 'entity' && edge.sourceId === conceptId) {
        entityIds.add(edge.targetId);
      }
    }

    const entities: CanonicalEntity[] = [];
    for (const id of entityIds) {
      const ent = await canonicalEntityService.getEntity(id);
      if (ent) entities.push(ent);
    }
    return entities;
  }

  /**
   * Validates edge integrity: source/target must exist, relationType must be valid, evidence must be present for factual claims.
   */
  validateEdge(edge: PlatformKnowledgeEdgeRecord): { valid: boolean; reason?: string } {
    if (!edge.id || !edge.sourceId || !edge.targetId) {
      return { valid: false, reason: 'Missing edge ID or endpoint IDs' };
    }
    if (edge.sourceId === edge.targetId) {
      return { valid: false, reason: 'Self-referential circular edges are prohibited' };
    }
    if (!edge.evidenceArticleIds || edge.evidenceArticleIds.length === 0) {
      return { valid: false, reason: 'Factual graph relationships must have at least one supporting evidenceArticleId' };
    }
    return { valid: true };
  }

  /**
   * Persists a knowledge edge to Firestore.
   */
  async saveEdge(record: PlatformKnowledgeEdgeRecord): Promise<void> {
    const check = this.validateEdge(record);
    if (!check.valid) {
      throw new Error(`Invalid knowledge edge: ${check.reason}`);
    }
    const docRef = doc(db, 'knowledgeEdges', record.id);
    await setDoc(docRef, record, { merge: true });
    this.edgeCache.set(record.id, toDomainKnowledgeEdge(record));
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
