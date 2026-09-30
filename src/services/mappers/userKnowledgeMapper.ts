import type {
  PlatformUserKnowledgeRecord,
  UserKnowledge,
  PlatformUserTrailProgressRecord,
  UserTrailProgress,
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

function parseOptionalTimestamp(ts: unknown): string | undefined {
  if (!ts) return undefined;
  return parseTimestamp(ts);
}

export function toDomainUserKnowledge(record: PlatformUserKnowledgeRecord): UserKnowledge {
  return {
    conceptId: record.conceptId,
    state: record.state || 'unseen',
    confidence: typeof record.confidence === 'number' ? Math.max(0, Math.min(1, record.confidence)) : 0.0,
    evidenceCount: typeof record.evidenceCount === 'number' ? Math.max(0, record.evidenceCount) : 0,
    firstSeenAt: parseOptionalTimestamp(record.firstSeenAt),
    lastInteractedAt: parseOptionalTimestamp(record.lastInteractedAt),
    lastReinforcedAt: parseOptionalTimestamp(record.lastReinforcedAt),
    explicitUserState: record.explicitUserState || null,
    evidenceSummary: {
      articlesCompleted: record.evidenceSummary?.articlesCompleted || 0,
      explanationsOpened: record.evidenceSummary?.explanationsOpened || 0,
      trailsCompleted: record.evidenceSummary?.trailsCompleted || 0,
      explicitSignals: record.evidenceSummary?.explicitSignals || 0,
    },
    updatedAt: parseTimestamp(record.updatedAt),
  };
}

export function toDomainUserTrailProgress(record: PlatformUserTrailProgressRecord): UserTrailProgress {
  return {
    trailId: record.trailId,
    currentStep: typeof record.currentStep === 'number' ? Math.max(1, record.currentStep) : 1,
    completedStepIds: Array.isArray(record.completedStepIds) ? record.completedStepIds : [],
    startedAt: parseTimestamp(record.startedAt),
    lastInteractedAt: parseTimestamp(record.lastInteractedAt),
    completedAt: record.completedAt ? parseTimestamp(record.completedAt) : null,
    updatedAt: parseTimestamp(record.updatedAt),
  };
}

export function toTransportUserKnowledge(knowledge: UserKnowledge): Record<string, unknown> {
  return {
    conceptId: knowledge.conceptId,
    state: knowledge.state,
    confidence: knowledge.confidence,
    evidenceCount: knowledge.evidenceCount,
    firstSeenAt: knowledge.firstSeenAt || null,
    lastInteractedAt: knowledge.lastInteractedAt || null,
    lastReinforcedAt: knowledge.lastReinforcedAt || null,
    explicitUserState: knowledge.explicitUserState || null,
    evidenceSummary: {
      articlesCompleted: knowledge.evidenceSummary?.articlesCompleted || 0,
      explanationsOpened: knowledge.evidenceSummary?.explanationsOpened || 0,
      trailsCompleted: knowledge.evidenceSummary?.trailsCompleted || 0,
      explicitSignals: knowledge.evidenceSummary?.explicitSignals || 0,
    },
    updatedAt: knowledge.updatedAt || new Date().toISOString(),
  };
}

export function toTransportUserTrailProgress(progress: UserTrailProgress): Record<string, unknown> {
  return {
    trailId: progress.trailId,
    currentStep: progress.currentStep,
    completedStepIds: progress.completedStepIds || [],
    startedAt: progress.startedAt || new Date().toISOString(),
    lastInteractedAt: progress.lastInteractedAt || new Date().toISOString(),
    completedAt: progress.completedAt || null,
    updatedAt: progress.updatedAt || new Date().toISOString(),
  };
}

