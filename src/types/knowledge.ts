import type { Timestamp } from 'firebase/firestore';

// ==========================================
// 1. PLATFORM TRANSPORT INTERFACES (FIRESTORE)
// ==========================================

export type EntityType =
  | 'person'
  | 'company'
  | 'organization'
  | 'government_body'
  | 'place'
  | 'product'
  | 'technology'
  | 'institution'
  | 'other';

export interface PlatformEntityRecord {
  id: string; // ent_<stable_id>
  canonicalName: string;
  type: EntityType;
  aliases: string[];
  shortDescription?: string;
  imageUrl?: string;
  externalIds?: {
    wikidata?: string;
    officialUrl?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ConceptDifficulty = 'basic' | 'intermediate' | 'advanced';

export interface PlatformConceptRecord {
  id: string; // con_<stable_id>
  name: string;
  aliases: string[];
  shortDefinition: string; // 1-3 sentences
  category: string; // e.g. 'Propulsion', 'Macroeconomics', 'Machine Learning', 'Energy'
  difficulty?: ConceptDifficulty;
  parentConceptIds?: string[];
  relatedConceptIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ConceptRelationType =
  | 'IS_A'
  | 'PART_OF'
  | 'REQUIRES'
  | 'RELATED_TO'
  | 'CONTRASTS_WITH';

export type EntityRelationType =
  | 'OWNS'
  | 'DEVELOPS'
  | 'OPERATES'
  | 'LOCATED_IN'
  | 'PARTNERS_WITH'
  | 'REGULATES'
  | 'CREATED_BY';

export type EntityConceptRelationType =
  | 'USES'
  | 'DEVELOPS'
  | 'AFFECTED_BY'
  | 'OPERATES_IN'
  | 'ASSOCIATED_WITH';

export type KnowledgeRelationType =
  | ConceptRelationType
  | EntityRelationType
  | EntityConceptRelationType;

export interface PlatformKnowledgeEdgeRecord {
  id: string; // edge_<sourceId>_<relationType>_<targetId>
  sourceId: string;
  targetId: string;
  sourceType: 'entity' | 'concept';
  targetType: 'entity' | 'concept';
  relationType: KnowledgeRelationType;
  evidenceArticleIds: string[];
  confidence: number; // 0.0 to 1.0
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlatformKnowledgeTrailStep {
  position: number;
  conceptId: string;
  title: string;
  explanation?: string;
  reason?: string; // Pedagogical reason for transition
}

export interface PlatformKnowledgeTrailRecord {
  id: string; // trail_<id>
  title: string;
  description?: string;
  entryConceptId: string;
  steps: PlatformKnowledgeTrailStep[];
  relatedEntityIds?: string[];
  relatedStoryIds?: string[];
  status: 'draft' | 'reviewed' | 'published';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Proposed review records to prevent canonical graph pollution
export interface PlatformProposedEntityRecord {
  id: string;
  candidateName: string;
  suggestedType: EntityType;
  aliases: string[];
  sourceArticleId: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence: number;
  createdAt: Timestamp;
}

export interface PlatformProposedConceptRecord {
  id: string;
  candidateName: string;
  suggestedDefinition: string;
  category: string;
  sourceArticleId: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence: number;
  createdAt: Timestamp;
}

// ==========================================
// 2. CLIENT DOMAIN INTERFACES
// ==========================================

export interface CanonicalEntity {
  id: string;
  canonicalName: string;
  type: EntityType;
  aliases: string[];
  shortDescription?: string;
  imageUrl?: string;
  externalIds?: {
    wikidata?: string;
    officialUrl?: string;
  };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CanonicalConcept {
  id: string;
  name: string;
  aliases: string[];
  shortDefinition: string;
  category: string;
  difficulty: ConceptDifficulty;
  parentConceptIds: string[];
  relatedConceptIds: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: 'entity' | 'concept';
  targetType: 'entity' | 'concept';
  relationType: KnowledgeRelationType;
  evidenceArticleIds: string[];
  confidence: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface KnowledgeTrailStep {
  position: number;
  conceptId: string;
  title: string;
  explanation?: string;
  reason?: string;
  concept?: CanonicalConcept;
}

export interface KnowledgeTrail {
  id: string;
  title: string;
  description?: string;
  entryConceptId: string;
  steps: KnowledgeTrailStep[];
  relatedEntityIds: string[];
  relatedStoryIds: string[];
  status: 'draft' | 'reviewed' | 'published';
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface ContextualConceptExplanation {
  concept: CanonicalConcept;
  contextualRelevance: string; // "Why it matters here"
  relatedConcepts: CanonicalConcept[];
  relatedEntities: CanonicalEntity[];
  trail?: KnowledgeTrail;
}

// ==========================================
// 3. PHASE 16E: PERSONAL KNOWLEDGE MODEL
// ==========================================

export type UserKnowledgeState = 'unseen' | 'exposed' | 'familiar' | 'understood';
export type ExplicitUserState = 'know_this' | 'learning' | null;
export type ExplanationMode = 'FOUNDATIONAL' | 'CONCISE_REFRESHER' | 'ASSUME_FAMILIARITY';
export type ConceptCentrality = 'primary' | 'supporting' | 'incidental';

export interface UserEvidenceSummary {
  articlesCompleted?: number;
  explanationsOpened?: number;
  trailsCompleted?: number;
  explicitSignals?: number;
}

export interface PlatformUserKnowledgeRecord {
  conceptId: string;
  state: UserKnowledgeState;
  confidence: number; // 0.0 to 1.0 (internal model confidence)
  evidenceCount: number;
  firstSeenAt?: Timestamp;
  lastInteractedAt?: Timestamp;
  lastReinforcedAt?: Timestamp;
  explicitUserState?: ExplicitUserState;
  evidenceSummary?: UserEvidenceSummary;
  updatedAt: Timestamp;
}

export interface UserKnowledge {
  conceptId: string;
  state: UserKnowledgeState;
  confidence: number;
  evidenceCount: number;
  firstSeenAt?: string; // ISO string
  lastInteractedAt?: string; // ISO string
  lastReinforcedAt?: string; // ISO string
  explicitUserState?: ExplicitUserState;
  evidenceSummary?: UserEvidenceSummary;
  updatedAt: string; // ISO string
}

export interface PlatformUserTrailProgressRecord {
  trailId: string;
  currentStep: number; // 1-indexed
  completedStepIds: string[];
  startedAt: Timestamp;
  lastInteractedAt: Timestamp;
  completedAt?: Timestamp | null;
  updatedAt: Timestamp;
}

export interface UserTrailProgress {
  trailId: string;
  currentStep: number; // 1-indexed
  completedStepIds: string[];
  startedAt: string; // ISO string
  lastInteractedAt: string; // ISO string
  completedAt?: string | null; // ISO string
  updatedAt: string; // ISO string
}

export type KnowledgeSignalType =
  | 'ARTICLE_COMPLETED'
  | 'CONCEPT_OPENED'
  | 'EXPLANATION_REQUESTED'
  | 'TRAIL_STEP_COMPLETED'
  | 'TRAIL_COMPLETED'
  | 'USER_KNOWS_CONCEPT'
  | 'USER_REQUESTS_BASICS'
  | 'RESET_CONCEPT';

export interface KnowledgeSignal {
  type: KnowledgeSignalType;
  conceptId: string;
  occurredAt: string; // ISO string
  conceptCentrality?: ConceptCentrality;
  sourceArticleId?: string;
  sourceTrailId?: string;
  stepIndex?: number;
}

