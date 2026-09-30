import type {
  ExplanationMode,
  CanonicalConcept,
  KnowledgeTrail,
  UserKnowledgeState,
} from '../types/knowledge';
import { userKnowledgeService } from './userKnowledgeService';
import { canonicalConceptService } from './canonicalConceptService';
import { knowledgeTrailService } from './knowledgeTrailService';

export class PersonalizationService {
  /**
   * Resolves the appropriate explanation density mode for a user and concept.
   */
  async getExplanationMode(userId: string, conceptId: string): Promise<ExplanationMode> {
    if (!userId || !conceptId) return 'FOUNDATIONAL';

    const knowledge = await userKnowledgeService.getConceptState(userId, conceptId);

    // Explicit user requests take highest priority
    if (knowledge.explicitUserState === 'learning') {
      return 'FOUNDATIONAL';
    }
    if (knowledge.explicitUserState === 'know_this') {
      return 'ASSUME_FAMILIARITY';
    }

    switch (knowledge.state) {
      case 'unseen':
      case 'exposed':
        return 'FOUNDATIONAL';
      case 'familiar':
        return 'CONCISE_REFRESHER';
      case 'understood':
        return 'ASSUME_FAMILIARITY';
      default:
        return 'FOUNDATIONAL';
    }
  }

  /**
   * Selects the most relevant Knowledge Trail that addresses actual knowledge gaps.
   * Avoids recommending trails where all concepts are already understood.
   */
  async getRecommendedTrail(
    userId: string,
    candidateConceptIds: string[]
  ): Promise<KnowledgeTrail | null> {
    if (!candidateConceptIds.length) return null;

    const allTrails = knowledgeTrailService.getAllKnowledgeTrails();
    if (!allTrails.length) return null;

    // Filter trails that cover at least one candidate concept
    const matchingTrails = allTrails.filter((trail) =>
      trail.steps.some((step) => candidateConceptIds.includes(step.conceptId))
    );

    if (!matchingTrails.length) return null;

    // Score trails based on user knowledge gaps
    let bestTrail: KnowledgeTrail | null = null;
    let maxUnlearnedSteps = 0;

    for (const trail of matchingTrails) {
      const stepConceptIds = trail.steps.map((s) => s.conceptId);
      const userStates = await userKnowledgeService.getMultipleConceptStates(userId, stepConceptIds);

      // Count unlearned steps (unseen or exposed)
      let unlearnedCount = 0;
      let allUnderstood = true;

      for (const cid of stepConceptIds) {
        const state = userStates[cid]?.state || 'unseen';
        if (state === 'unseen' || state === 'exposed') {
          unlearnedCount++;
        }
        if (state !== 'understood') {
          allUnderstood = false;
        }
      }

      // Skip trails where everything is already understood
      if (allUnderstood) continue;

      if (unlearnedCount > maxUnlearnedSteps) {
        maxUnlearnedSteps = unlearnedCount;
        bestTrail = trail;
      }
    }

    return bestTrail;
  }

  /**
   * Identifies the next most useful concept for the user to understand.
   * Returns null if the user already understands all attached concepts.
   */
  async getNextUsefulConcept(
    userId: string,
    candidateConceptIds: string[]
  ): Promise<CanonicalConcept | null> {
    if (!candidateConceptIds.length) return null;

    const userStates = await userKnowledgeService.getMultipleConceptStates(
      userId,
      candidateConceptIds
    );

    // Find first unseen or exposed concept
    for (const cid of candidateConceptIds) {
      const state = userStates[cid]?.state || 'unseen';
      if (state === 'unseen' || state === 'exposed') {
        const concept = await canonicalConceptService.getConcept(cid);
        if (concept) return concept;
      }
    }

    // Next check for familiar concepts that could be deepened
    for (const cid of candidateConceptIds) {
      const state = userStates[cid]?.state || 'unseen';
      if (state === 'familiar') {
        const concept = await canonicalConceptService.getConcept(cid);
        if (concept) return concept;
      }
    }

    return null;
  }

  /**
   * Formats a minimal knowledge state map for MEDHA LLM context injection.
   */
  async getMedhaKnowledgeContext(
    userId: string,
    relevantConceptIds: string[]
  ): Promise<Record<string, UserKnowledgeState>> {
    const result: Record<string, UserKnowledgeState> = {};
    if (!userId || !relevantConceptIds.length) return result;

    const states = await userKnowledgeService.getMultipleConceptStates(userId, relevantConceptIds);
    for (const [cid, uk] of Object.entries(states)) {
      result[cid] = uk.state;
    }

    return result;
  }
}

export const personalizationService = new PersonalizationService();
