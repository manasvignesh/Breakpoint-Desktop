import type {
  PlatformEntityRecord,
  PlatformConceptRecord,
  PlatformKnowledgeEdgeRecord,
  PlatformKnowledgeTrailRecord,
  CanonicalEntity,
  CanonicalConcept,
  KnowledgeEdge,
  KnowledgeTrail,
} from '../../types/knowledge';

function parseTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (typeof ts === 'number') return new Date(ts).toISOString();
  if (typeof ts === 'object' && 'seconds' in (ts as Record<string, unknown>)) {
    return new Date((ts as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

export function toDomainEntity(record: PlatformEntityRecord): CanonicalEntity {
  return {
    id: record.id,
    canonicalName: record.canonicalName || '',
    type: record.type || 'other',
    aliases: Array.isArray(record.aliases) ? record.aliases : [],
    shortDescription: record.shortDescription,
    imageUrl: record.imageUrl,
    externalIds: record.externalIds,
    createdAt: parseTimestamp(record.createdAt),
    updatedAt: parseTimestamp(record.updatedAt),
  };
}

export function toDomainConcept(record: PlatformConceptRecord): CanonicalConcept {
  return {
    id: record.id,
    name: record.name || '',
    aliases: Array.isArray(record.aliases) ? record.aliases : [],
    shortDefinition: record.shortDefinition || '',
    category: record.category || 'General',
    difficulty: record.difficulty || 'basic',
    parentConceptIds: Array.isArray(record.parentConceptIds) ? record.parentConceptIds : [],
    relatedConceptIds: Array.isArray(record.relatedConceptIds) ? record.relatedConceptIds : [],
    createdAt: parseTimestamp(record.createdAt),
    updatedAt: parseTimestamp(record.updatedAt),
  };
}

export function toDomainKnowledgeEdge(record: PlatformKnowledgeEdgeRecord): KnowledgeEdge {
  return {
    id: record.id,
    sourceId: record.sourceId,
    targetId: record.targetId,
    sourceType: record.sourceType,
    targetType: record.targetType,
    relationType: record.relationType,
    evidenceArticleIds: Array.isArray(record.evidenceArticleIds) ? record.evidenceArticleIds : [],
    confidence: typeof record.confidence === 'number' ? record.confidence : 1.0,
    createdAt: parseTimestamp(record.createdAt),
    updatedAt: parseTimestamp(record.updatedAt),
  };
}

export function toDomainKnowledgeTrail(record: PlatformKnowledgeTrailRecord): KnowledgeTrail {
  return {
    id: record.id,
    title: record.title || '',
    description: record.description,
    entryConceptId: record.entryConceptId || '',
    steps: Array.isArray(record.steps)
      ? record.steps.map((s, idx) => ({
          position: typeof s.position === 'number' ? s.position : idx + 1,
          conceptId: s.conceptId,
          title: s.title || '',
          explanation: s.explanation,
          reason: s.reason,
        }))
      : [],
    relatedEntityIds: Array.isArray(record.relatedEntityIds) ? record.relatedEntityIds : [],
    relatedStoryIds: Array.isArray(record.relatedStoryIds) ? record.relatedStoryIds : [],
    status: record.status || 'published',
    createdAt: parseTimestamp(record.createdAt),
    updatedAt: parseTimestamp(record.updatedAt),
  };
}
