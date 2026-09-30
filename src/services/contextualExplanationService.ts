import type {
  ContextualConceptExplanation,
} from '../types/knowledge';
import { canonicalConceptService } from './canonicalConceptService';
import { knowledgeGraphService } from './knowledgeGraphService';
import { knowledgeTrailService } from './knowledgeTrailService';

// Story-specific context generation mappings
const STORY_CONTEXT_TEMPLATES: Record<string, string> = {
  'con_semi_cryogenic_engine':
    `In this story, ISRO's successful hot test of the semi-cryogenic engine power head validates the core propulsion technology that will replace the liquid core stage in future LVM3 heavy-lift launches.`,
  'con_cryogenic_engine':
    `Cryogenic upper stages currently power India's GSLV and LVM3 rockets; understanding them highlights why upgrading the lower booster to semi-cryogenic propellants is a complementary leap.`,
  'con_rocket_propulsion':
    `Rocket propulsion fundamentals govern how ISRO increases payload capabilities from 4,000 kg to 6,000 kg to GTO for domestic satellite launches.`,
  'con_thrust':
    `Generating 2,000 kN of thrust is the primary milestone achieved in the hot test at Mahendragiri, crucial for lifting heavier satellite payloads off the launchpad.`,
  'con_repo_rate':
    `The RBI Monetary Policy Committee decided to keep the repo rate unchanged, meaning home loan and commercial borrowing interest rates will remain steady for consumers and businesses.`,
  'con_monetary_policy':
    `This report reflects the central bank's calibrated macroeconomic stance to balance retail inflation containment with industrial GDP growth.`,
  'con_inflation_targeting':
    `With headline retail inflation monitored closely, the RBI maintains elevated policy rates to anchor long-term price expectations within the 4% target band.`,
  'con_waterless_cooling':
    `Vigyanlabs launched the FEMTO sovereign AI box utilizing waterless thermal management, eliminating the massive municipal water consumption typical of large datacenters.`,
  'con_sovereign_ai':
    `This development advances India's national objective to own and control secure compute infrastructure, domestic datasets, and indigenous models locally.`,
  'con_supercomputer':
    `The deployment of PARAM Rudra supercomputing clusters across Pune, Delhi, and Kolkata provides the compute horsepower required for national AI and medical research.`,
  'con_semiconductor_fab':
    `Tata Electronics completing its cleanroom structural shell in Dholera marks a tangible step toward producing India's first commercially fabricated microchips.`,
  'con_cleanroom':
    `Cleanroom completion is the highest-precision engineering prerequisite before sensitive lithography tools from TSMC can be installed in Dholera.`,
  'con_fast_charging':
    `Ather Energy expanding 500 fast chargers along national highways directly addresses highway range anxiety for electric two-wheelers across India.`,
  'con_powertrain':
    `The powertrain engineering in new electric vehicles delivers the efficiency, acceleration, and thermal durability needed for diverse Indian road conditions.`,
  'con_gcc':
    `Fuel Cycle expanding its Navi Mumbai GCC demonstrates how global companies are utilizing Indian technical talent for core AI product engineering rather than traditional back-office support.`,
  'con_upi':
    `NPCI's expansion of pre-sanctioned credit lines on UPI allows consumers to access digital bank loans directly during QR code checkout.`,
};

export class ContextualExplanationService {
  /**
   * Generates a grounded, contextual explanation for a concept within a story/article.
   */
  async getContextualExplanation(
    conceptId: string,
    articleContext?: { title?: string; whatHappened?: string; summary?: string }
  ): Promise<ContextualConceptExplanation | null> {
    const concept = await canonicalConceptService.getConcept(conceptId);
    if (!concept) return null;

    const articleTitle = articleContext?.title || '';
    let contextualRelevance = '';

    if (STORY_CONTEXT_TEMPLATES[conceptId]) {
      contextualRelevance = STORY_CONTEXT_TEMPLATES[conceptId];
    } else if (articleContext?.whatHappened) {
      contextualRelevance = `Understanding ${concept.name} provides the necessary technical background for the key developments reported in: "${articleTitle}".`;
    } else {
      contextualRelevance = `${concept.name} is a foundational concept relevant to understanding this story thread.`;
    }

    const [relatedConcepts, relatedEntities, trails] = await Promise.all([
      knowledgeGraphService.getRelatedConcepts(conceptId),
      knowledgeGraphService.getEntitiesForConcept(conceptId),
      knowledgeTrailService.getTrailsForConcept(conceptId),
    ]);

    return {
      concept,
      contextualRelevance,
      relatedConcepts,
      relatedEntities,
      trail: trails.length > 0 ? trails[0] : undefined,
    };
  }
}

export const contextualExplanationService = new ContextualExplanationService();
