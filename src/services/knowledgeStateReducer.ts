import type {
  UserKnowledge,
  KnowledgeSignal,
  UserKnowledgeState,
} from '../types/knowledge';

/**
 * Creates a blank/unseen UserKnowledge record for a concept.
 */
export function createInitialUserKnowledge(conceptId: string, timestamp?: string): UserKnowledge {
  const ts = timestamp || new Date().toISOString();
  return {
    conceptId,
    state: 'unseen',
    confidence: 0.0,
    evidenceCount: 0,
    firstSeenAt: undefined,
    lastInteractedAt: undefined,
    lastReinforcedAt: undefined,
    explicitUserState: null,
    evidenceSummary: {
      articlesCompleted: 0,
      explanationsOpened: 0,
      trailsCompleted: 0,
      explicitSignals: 0,
    },
    updatedAt: ts,
  };
}

/**
 * Pure deterministic state reducer for user concept knowledge.
 * Computes updated UserKnowledge state given existing state and an incoming KnowledgeSignal.
 */
export function reduceKnowledgeState(
  currentState: UserKnowledge | null | undefined,
  signal: KnowledgeSignal
): UserKnowledge {
  const current: UserKnowledge = currentState
    ? {
        ...currentState,
        evidenceSummary: {
          articlesCompleted: currentState.evidenceSummary?.articlesCompleted || 0,
          explanationsOpened: currentState.evidenceSummary?.explanationsOpened || 0,
          trailsCompleted: currentState.evidenceSummary?.trailsCompleted || 0,
          explicitSignals: currentState.evidenceSummary?.explicitSignals || 0,
        },
      }
    : createInitialUserKnowledge(signal.conceptId, signal.occurredAt);

  const occurredAt = signal.occurredAt || new Date().toISOString();
  const firstSeenAt = current.firstSeenAt || occurredAt;

  switch (signal.type) {
    // -------------------------------------------------------------------
    // 1. EXPLICIT USER CONTROLS (Highest Precedence)
    // -------------------------------------------------------------------
    case 'RESET_CONCEPT': {
      return {
        conceptId: signal.conceptId,
        state: 'unseen',
        confidence: 0.0,
        evidenceCount: 0,
        firstSeenAt: undefined,
        lastInteractedAt: undefined,
        lastReinforcedAt: undefined,
        explicitUserState: null,
        evidenceSummary: {
          articlesCompleted: 0,
          explanationsOpened: 0,
          trailsCompleted: 0,
          explicitSignals: 0,
        },
        updatedAt: occurredAt,
      };
    }

    case 'USER_KNOWS_CONCEPT': {
      return {
        ...current,
        state: 'understood',
        confidence: 0.95,
        evidenceCount: current.evidenceCount + 1,
        firstSeenAt,
        lastInteractedAt: occurredAt,
        lastReinforcedAt: occurredAt,
        explicitUserState: 'know_this',
        evidenceSummary: {
          ...current.evidenceSummary,
          explicitSignals: (current.evidenceSummary?.explicitSignals || 0) + 1,
        },
        updatedAt: occurredAt,
      };
    }

    case 'USER_REQUESTS_BASICS': {
      // Explicit request for elementary help demotes understood state to learning/exposed
      let newState: UserKnowledgeState = 'exposed';
      if (current.state === 'understood') {
        newState = 'familiar';
      } else if (current.state === 'familiar') {
        newState = 'exposed';
      }

      return {
        ...current,
        state: newState,
        confidence: 0.85,
        evidenceCount: current.evidenceCount + 1,
        firstSeenAt,
        lastInteractedAt: occurredAt,
        explicitUserState: 'learning',
        evidenceSummary: {
          ...current.evidenceSummary,
          explicitSignals: (current.evidenceSummary?.explicitSignals || 0) + 1,
        },
        updatedAt: occurredAt,
      };
    }

    // -------------------------------------------------------------------
    // 2. ARTICLE CONSUMPTION SIGNALS
    // -------------------------------------------------------------------
    case 'ARTICLE_COMPLETED': {
      const centrality = signal.conceptCentrality || 'supporting';
      
      // Incidental mentions generate 0 knowledge promotion
      if (centrality === 'incidental') {
        return {
          ...current,
          updatedAt: occurredAt,
        };
      }

      const articlesCompleted = (current.evidenceSummary?.articlesCompleted || 0) + 1;
      const newEvidenceCount = current.evidenceCount + 1;

      // If user has explicit 'know_this', preserve 'understood'
      if (current.explicitUserState === 'know_this') {
        return {
          ...current,
          evidenceCount: newEvidenceCount,
          lastInteractedAt: occurredAt,
          lastReinforcedAt: occurredAt,
          evidenceSummary: {
            ...current.evidenceSummary,
            articlesCompleted,
          },
          updatedAt: occurredAt,
        };
      }

      let nextState: UserKnowledgeState = current.state;
      let nextConfidence = current.confidence;
      let lastReinforcedAt = current.lastReinforcedAt;

      if (current.state === 'unseen') {
        nextState = 'exposed';
        nextConfidence = centrality === 'primary' ? 0.65 : 0.50;
      } else if (current.state === 'exposed') {
        // Requires 2+ completed articles where concept is primary/supporting to reach familiar
        if (articlesCompleted >= 2 && (centrality === 'primary' || articlesCompleted >= 3)) {
          nextState = 'familiar';
          nextConfidence = 0.70;
          lastReinforcedAt = occurredAt;
        } else {
          nextConfidence = Math.min(0.65, nextConfidence + 0.05);
        }
      } else if (current.state === 'familiar') {
        lastReinforcedAt = occurredAt;
        nextConfidence = Math.min(0.85, nextConfidence + 0.05);
        // Note: Reading articles alone does not jump from familiar -> understood without trail or explicit confirmation
      } else if (current.state === 'understood') {
        lastReinforcedAt = occurredAt;
      }

      return {
        ...current,
        state: nextState,
        confidence: Math.max(0, Math.min(1, nextConfidence)),
        evidenceCount: newEvidenceCount,
        firstSeenAt,
        lastInteractedAt: occurredAt,
        lastReinforcedAt,
        evidenceSummary: {
          ...current.evidenceSummary,
          articlesCompleted,
        },
        updatedAt: occurredAt,
      };
    }

    // -------------------------------------------------------------------
    // 3. CONCEPT & EXPLANATION ENGAGEMENT SIGNALS
    // -------------------------------------------------------------------
    case 'CONCEPT_OPENED':
    case 'EXPLANATION_REQUESTED': {
      const explanationsOpened = (current.evidenceSummary?.explanationsOpened || 0) + 1;
      const newEvidenceCount = current.evidenceCount + 1;

      // If unseen, opening explanation makes the user exposed
      let nextState: UserKnowledgeState = current.state;
      let nextConfidence = current.confidence;

      if (current.state === 'unseen') {
        nextState = 'exposed';
        nextConfidence = 0.50;
      }

      return {
        ...current,
        state: nextState,
        confidence: nextConfidence,
        evidenceCount: newEvidenceCount,
        firstSeenAt,
        lastInteractedAt: occurredAt,
        evidenceSummary: {
          ...current.evidenceSummary,
          explanationsOpened,
        },
        updatedAt: occurredAt,
      };
    }

    // -------------------------------------------------------------------
    // 4. KNOWLEDGE TRAIL PROGRESSION SIGNALS
    // -------------------------------------------------------------------
    case 'TRAIL_STEP_COMPLETED': {
      const newEvidenceCount = current.evidenceCount + 1;
      let nextState: UserKnowledgeState = current.state;
      let nextConfidence = current.confidence;

      if (current.state === 'unseen' || current.state === 'exposed') {
        nextState = 'familiar';
        nextConfidence = 0.75;
      } else if (current.state === 'familiar') {
        nextConfidence = Math.min(0.85, nextConfidence + 0.05);
      }

      return {
        ...current,
        state: nextState,
        confidence: nextConfidence,
        evidenceCount: newEvidenceCount,
        firstSeenAt,
        lastInteractedAt: occurredAt,
        lastReinforcedAt: occurredAt,
        updatedAt: occurredAt,
      };
    }

    case 'TRAIL_COMPLETED': {
      const trailsCompleted = (current.evidenceSummary?.trailsCompleted || 0) + 1;
      const newEvidenceCount = current.evidenceCount + 2;

      let nextState: UserKnowledgeState = current.state;
      let nextConfidence = current.confidence;

      if (current.state === 'familiar') {
        nextState = 'understood';
        nextConfidence = 0.85;
      } else if (current.state === 'exposed' || current.state === 'unseen') {
        nextState = 'familiar';
        nextConfidence = 0.80;
      }

      return {
        ...current,
        state: nextState,
        confidence: nextConfidence,
        evidenceCount: newEvidenceCount,
        firstSeenAt,
        lastInteractedAt: occurredAt,
        lastReinforcedAt: occurredAt,
        evidenceSummary: {
          ...current.evidenceSummary,
          trailsCompleted,
        },
        updatedAt: occurredAt,
      };
    }

    default:
      return current;
  }
}
