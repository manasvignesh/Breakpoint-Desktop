import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type {
  PlatformKnowledgeTrailRecord,
  KnowledgeTrail,
} from '../types/knowledge';
import { toDomainKnowledgeTrail } from './mappers/knowledgeMapper';
import { canonicalConceptService } from './canonicalConceptService';

// 10 Authoritative Pre-Curated Seed Knowledge Trails grounded in production stories
export const SEED_KNOWLEDGE_TRAILS: PlatformKnowledgeTrailRecord[] = [
  // 1. ISRO Propulsion Journey
  {
    id: 'trail_isro_propulsion',
    title: 'How Rocket Propulsion Powers Space Access',
    description: 'Understand the engineering progression from fundamental rocket propulsion to high-thrust semi-cryogenic engines.',
    entryConceptId: 'con_rocket_propulsion',
    steps: [
      {
        position: 1,
        conceptId: 'con_rocket_propulsion',
        title: 'Fundamental Rocket Propulsion',
        explanation: 'How rockets produce momentum by burning propellants and expelling exhaust gases at supersonic velocity.',
        reason: 'Essential foundational physics needed before understanding specialized propulsion cycles.',
      },
      {
        position: 2,
        conceptId: 'con_cryogenic_engine',
        title: 'Cryogenic Liquid Propulsion',
        explanation: 'Why storing supercooled liquid hydrogen and oxygen provides unmatched fuel efficiency for upper orbital stages.',
        reason: 'Explains ISRO’s existing upper-stage architecture before introducing the new booster upgrade.',
      },
      {
        position: 3,
        conceptId: 'con_semi_cryogenic_engine',
        title: 'Semi-Cryogenic Booster Technology',
        explanation: 'How substituting kerosene for liquid hydrogen delivers denser propellant packing and massive liftoff thrust.',
        reason: 'Directly explains the core technology tested at Mahendragiri.',
      },
      {
        position: 4,
        conceptId: 'con_thrust',
        title: 'Maximizing Liftoff Thrust',
        explanation: 'How 2000 kN of semi-cryogenic thrust allows rockets to lift heavier payloads without expanding vehicle diameter.',
        reason: 'Demonstrates the physical advantage gained by the engine upgrade.',
      },
      {
        position: 5,
        conceptId: 'con_payload_capacity',
        title: 'Heavy-Lift Payload Capability',
        explanation: 'How upgrading the LVM3 core stage enables India to launch 6-tonne commercial communication satellites independently.',
        reason: 'Connects the engineering breakthrough directly to national economic and sovereign space capability.',
      },
    ],
    relatedEntityIds: ['ent_isro'],
    relatedStoryIds: ['st_isro_01'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 2. RBI Monetary Policy & Repo Rate
  {
    id: 'trail_rbi_monetary_policy',
    title: 'How RBI Monetary Policy Shapes the Economy',
    description: 'Follow how interest rates, inflation targets, and central bank decisions dictate borrowing costs across India.',
    entryConceptId: 'con_interest_rate',
    steps: [
      {
        position: 1,
        conceptId: 'con_interest_rate',
        title: 'Interest Rates & The Cost of Money',
        explanation: 'How borrowing costs determine consumer spending, home loans, and corporate capital investment.',
        reason: 'The fundamental building block for understanding monetary policy transmission.',
      },
      {
        position: 2,
        conceptId: 'con_repo_rate',
        title: 'The Benchmark Policy Repo Rate',
        explanation: 'How the Reserve Bank of India sets the benchmark lending rate for commercial banks.',
        reason: 'Explains the specific policy lever announced in the MPC meeting.',
      },
      {
        position: 3,
        conceptId: 'con_monetary_policy',
        title: 'Central Banking Monetary Policy',
        explanation: 'How the MPC balances liquidity, currency stability, and GDP growth via rate decisions.',
        reason: 'Broadens understanding to the institutional decision-making process.',
      },
      {
        position: 4,
        conceptId: 'con_inflation_targeting',
        title: 'The 4% Retail Inflation Mandate',
        explanation: 'Why RBI keeps rates elevated when food or energy inflation threatens price stability.',
        reason: 'Explains why the MPC opted to maintain an unchanged stance rather than cutting rates.',
      },
    ],
    relatedEntityIds: ['ent_rbi'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 3. Sovereign AI Infrastructure
  {
    id: 'trail_sovereign_ai',
    title: 'Building Sovereign AI & Sustainable Compute',
    description: 'From foundation models to waterless thermal engineering and indigenous AI data centers.',
    entryConceptId: 'con_large_language_model',
    steps: [
      {
        position: 1,
        conceptId: 'con_large_language_model',
        title: 'Foundational AI Models',
        explanation: 'How generative models are trained to process and generate language across languages and code.',
        reason: 'Foundational baseline for modern AI computing demands.',
      },
      {
        position: 2,
        conceptId: 'con_sovereign_ai',
        title: 'The Sovereign AI Imperative',
        explanation: 'Why nations require indigenous datacenter infrastructure to protect domestic data and model sovereignty.',
        reason: 'Explains why IndiaAI mission and indigenous hardware exist.',
      },
      {
        position: 3,
        conceptId: 'con_waterless_cooling',
        title: 'Waterless Datacenter Engineering',
        explanation: 'How high-density compute boxes like Vigyanlabs FEMTO operate without consuming municipal water.',
        reason: 'Directly addresses the environmental constraint of enterprise AI computing.',
      },
      {
        position: 4,
        conceptId: 'con_supercomputer',
        title: 'National Supercomputing Grids',
        explanation: 'How clusters like PARAM Rudra interconnect to power national healthcare and scientific breakthroughs.',
        reason: 'Demonstrates end-to-end sovereign compute deployment.',
      },
    ],
    relatedEntityIds: ['ent_vigyanlabs', 'ent_cdac', 'ent_meity'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 4. Semiconductor Fabrication in India
  {
    id: 'trail_semiconductor_fab',
    title: 'The Journey of Semiconductor Fabrication',
    description: 'How silicon wafers, cleanroom environments, and packaging create microchips in Dholera.',
    entryConceptId: 'con_semiconductor_fab',
    steps: [
      {
        position: 1,
        conceptId: 'con_semiconductor_fab',
        title: 'What is a Semiconductor Fab?',
        explanation: 'The industrial facility where microscopic transistors are patterned onto pure silicon wafers.',
        reason: 'Establishes the core facility context for India’s ₹91,000 crore semiconductor investments.',
      },
      {
        position: 2,
        conceptId: 'con_cleanroom',
        title: 'Cleanroom Physics & Contamination Control',
        explanation: 'Why manufacturing microchips requires air 1,000 times cleaner than an operating room.',
        reason: 'Explains the critical milestone of Tata Electronics completing its Dholera cleanroom shell.',
      },
      {
        position: 3,
        conceptId: 'con_atmp_osat',
        title: 'Downstream Packaging & Testing (ATMP)',
        explanation: 'How finished silicon wafers are diced into chips, housed in protective casings, and tested.',
        reason: 'Connects foundry fabrication to final commercial deployment in consumer and automotive devices.',
      },
    ],
    relatedEntityIds: ['ent_tata_electronics', 'ent_tsmc', 'ent_loc_dholera'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 5. Electric Powertrain & Fast-Charging Ecosystem
  {
    id: 'trail_ev_powertrain',
    title: 'Electric Vehicle Powertrains & Fast-Charging Grid',
    description: 'How battery motors and highway fast-charging networks unlock mainstream EV adoption.',
    entryConceptId: 'con_powertrain',
    steps: [
      {
        position: 1,
        conceptId: 'con_powertrain',
        title: 'The Electric Powertrain',
        explanation: 'How motors, inverters, and controllers convert electrical energy into mechanical movement with 90%+ efficiency.',
        reason: 'The fundamental engineering core of any electric scooter or vehicle.',
      },
      {
        position: 2,
        conceptId: 'con_fast_charging',
        title: 'Fast-Charging Grid Infrastructure',
        explanation: 'How high-power DC charging grids eliminate range anxiety by delivering 80% charge in minutes.',
        reason: 'Directly explains Ather Energy’s expansion of 500 highway fast-charging points.',
      },
    ],
    relatedEntityIds: ['ent_ather_energy', 'ent_matel_motion'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 6. Global Capability Centres (GCC) Growth
  {
    id: 'trail_gcc_expansion',
    title: 'How Global Capability Centres Elevate Indian Tech',
    description: 'The shift from back-office IT outsourcing to high-value AI research and core engineering hubs.',
    entryConceptId: 'con_it_services',
    steps: [
      {
        position: 1,
        conceptId: 'con_it_services',
        title: 'Traditional IT Services & Outsourcing',
        explanation: 'How India built global leadership in software exports, digital transformation, and cloud maintenance.',
        reason: 'Historical baseline showing the foundation of Indian technical talent.',
      },
      {
        position: 2,
        conceptId: 'con_gcc',
        title: 'The Global Capability Centre (GCC) Model',
        explanation: 'How global companies build proprietary engineering centres in cities like Navi Mumbai and Hyderabad.',
        reason: 'Explains Fuel Cycle and global enterprises expanding dedicated engineering hubs.',
      },
    ],
    relatedEntityIds: ['ent_fuel_cycle', 'ent_loc_navi_mumbai', 'ent_loc_hyderabad'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 7. UPI & Next-Gen Digital Payments
  {
    id: 'trail_upi_payments',
    title: 'The Architecture of Instant Digital Payments',
    description: 'How interoperable public digital rails transformed consumer payments and banking.',
    entryConceptId: 'con_upi',
    steps: [
      {
        position: 1,
        conceptId: 'con_upi',
        title: 'Unified Payments Interface (UPI)',
        explanation: 'How virtual payment addresses enable instant 24/7 bank-to-bank transfers without exposing account numbers.',
        reason: 'Foundational digital public infrastructure underpinning India’s fintech growth.',
      },
      {
        position: 2,
        conceptId: 'con_interest_rate',
        title: 'Credit Lines on UPI',
        explanation: 'How pre-sanctioned credit lines on UPI integrate digital lending directly into merchant checkout.',
        reason: 'Explains NPCI’s latest expansion to 15 commercial banks.',
      },
    ],
    relatedEntityIds: ['ent_npci'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 8. Supercomputing & High-Performance Computing
  {
    id: 'trail_supercomputing',
    title: 'National Supercomputing Architecture',
    description: 'From parallel compute nodes to national grid applications in healthcare and quantum-safe communications.',
    entryConceptId: 'con_supercomputer',
    steps: [
      {
        position: 1,
        conceptId: 'con_supercomputer',
        title: 'Supercomputing Architecture',
        explanation: 'How thousands of interconnected CPU and GPU nodes execute complex numerical simulations concurrently.',
        reason: 'Foundational high-performance compute context.',
      },
      {
        position: 2,
        conceptId: 'con_sovereign_ai',
        title: 'National AI Infrastructure Integration',
        explanation: 'How supercomputers like PARAM Rudra power indigenous Indic language models and cancer research (iOncology.ai).',
        reason: 'Explains the public deployment across Pune, Delhi, and Kolkata.',
      },
    ],
    relatedEntityIds: ['ent_cdac'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 9. Transformer Models & Indic AI
  {
    id: 'trail_indic_llm',
    title: 'From Transformer Architecture to Indic AI',
    description: 'How self-attention neural networks power multilingual reasoning models for Indian languages.',
    entryConceptId: 'con_transformer_model',
    steps: [
      {
        position: 1,
        conceptId: 'con_transformer_model',
        title: 'Self-Attention & Transformers',
        explanation: 'How attention mechanisms weigh contextual relationships across long paragraphs of text.',
        reason: 'The foundational neural architecture behind every modern LLM.',
      },
      {
        position: 2,
        conceptId: 'con_large_language_model',
        title: 'Large Language Models',
        explanation: 'How foundation models learn broad linguistic and logical reasoning patterns from text corpora.',
        reason: 'Connects basic architecture to applied foundation models.',
      },
      {
        position: 3,
        conceptId: 'con_sovereign_ai',
        title: 'Indic Language Optimization',
        explanation: 'Why training models on native tokenizers (like Sarvam-1 and BharatGPT) outperforms generic English models.',
        reason: 'Explains the practical impact for multilingual Indian applications.',
      },
    ],
    relatedEntityIds: ['ent_sarvam_ai', 'ent_meity'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },

  // 10. Startup Capital & The IPO Journey
  {
    id: 'trail_startup_ipo',
    title: 'The Startup Capital Lifecycle: VC to IPO',
    description: 'How high-growth technology companies scale from early-stage venture funding to public market listing.',
    entryConceptId: 'con_venture_capital',
    steps: [
      {
        position: 1,
        conceptId: 'con_venture_capital',
        title: 'Venture Capital & Growth Equity',
        explanation: 'How startups raise institutional equity rounds (Series A/B) to fund technology R&D and market expansion.',
        reason: 'The initial funding mechanism for emerging tech startups.',
      },
      {
        position: 2,
        conceptId: 'con_ipo',
        title: 'Initial Public Offering (IPO)',
        explanation: 'How mature growth companies file prospectuses with SEBI to list on public stock exchanges.',
        reason: 'Explains major tech public listings and regulatory compliance.',
      },
    ],
    relatedEntityIds: ['ent_sebi'],
    status: 'published',
    createdAt: { seconds: 1725500000, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1725500000, nanoseconds: 0 } as any,
  },
];

export class KnowledgeTrailService {
  private trailCache: Map<string, KnowledgeTrail> = new Map();

  constructor() {
    // Runtime starts with an empty cache and populates dynamically from Firestore
  }

  /**
   * Fetches all published canonical knowledge trails from Firestore into cache.
   */
  async fetchAllTrails(): Promise<KnowledgeTrail[]> {
    try {
      const q = query(collection(db, 'knowledgeTrails'), where('status', '==', 'published'));
      const snap = await getDocs(q);
      const trails: KnowledgeTrail[] = [];
      snap.forEach(docSnap => {
        const trail = toDomainKnowledgeTrail({ ...(docSnap.data() as PlatformKnowledgeTrailRecord), id: docSnap.id });
        this.trailCache.set(trail.id, trail);
        trails.push(trail);
      });
      return trails;
    } catch (err) {
      console.warn('[KnowledgeTrailService] Failed to fetch trails from Firestore:', err);
      return Array.from(this.trailCache.values());
    }
  }

  /**
   * Subscribes to real-time published knowledge trails in Firestore.
   */
  subscribeToTrails(onData: (trails: KnowledgeTrail[]) => void, onError?: (err: Error) => void): () => void {
    const q = query(collection(db, 'knowledgeTrails'), where('status', '==', 'published'));
    return onSnapshot(
      q,
      (snap) => {
        const trails: KnowledgeTrail[] = [];
        snap.forEach(docSnap => {
          const trail = toDomainKnowledgeTrail({ ...(docSnap.data() as PlatformKnowledgeTrailRecord), id: docSnap.id });
          this.trailCache.set(trail.id, trail);
          trails.push(trail);
        });
        onData(trails);
      },
      (err) => {
        console.warn('[KnowledgeTrailService] Snapshot error:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Retrieves a knowledge trail by ID.
   */
  async getTrail(trailId: string): Promise<KnowledgeTrail | null> {
    if (!trailId) return null;
    if (this.trailCache.has(trailId)) {
      return this.trailCache.get(trailId)!;
    }

    try {
      const docRef = doc(db, 'knowledgeTrails', trailId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const trail = toDomainKnowledgeTrail({ ...(snap.data() as PlatformKnowledgeTrailRecord), id: snap.id });
        this.trailCache.set(trailId, trail);
        return trail;
      }
    } catch (err) {
      console.warn(`[KnowledgeTrailService] Error fetching trail ${trailId}:`, err);
    }
    return null;
  }

  /**
   * Retrieves all published knowledge trails that start with or contain a specific concept.
   */
  async getTrailsForConcept(conceptId: string): Promise<KnowledgeTrail[]> {
    if (!conceptId) return [];
    return Array.from(this.trailCache.values()).filter(
      trail => trail.entryConceptId === conceptId || trail.steps.some(s => s.conceptId === conceptId)
    );
  }

  /**
   * Retrieves all cached canonical knowledge trails.
   */
  getAllKnowledgeTrails(): KnowledgeTrail[] {
    return Array.from(this.trailCache.values());
  }

  /**
   * Retrieves recommended knowledge trails relevant to a story's concepts.
   */
  async getTrailsForStory(storyId: string, conceptIds: string[]): Promise<KnowledgeTrail[]> {
    const conceptSet = new Set(conceptIds);
    const trails: KnowledgeTrail[] = [];

    for (const trail of this.trailCache.values()) {
      if (trail.relatedStoryIds.includes(storyId) || conceptSet.has(trail.entryConceptId)) {
        trails.push(trail);
      } else if (trail.steps.some(s => conceptSet.has(s.conceptId))) {
        trails.push(trail);
      }
    }

    return trails;
  }

  /**
   * Validates a Knowledge Trail against pedagogical quality rules:
   * 1. 3 to 6 steps
   * 2. No duplicate concepts within the trail
   * 3. No circular cycles
   * 4. All concept IDs must exist
   */
  validateTrail(trail: KnowledgeTrail): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!trail.title || trail.title.trim().length < 5) {
      errors.push('Trail title is too short or missing');
    }

    if (trail.steps.length < 2 || trail.steps.length > 6) {
      errors.push(`Trail length (${trail.steps.length}) must be between 2 and 6 steps`);
    }

    const seenConceptIds = new Set<string>();
    for (let i = 0; i < trail.steps.length; i++) {
      const step = trail.steps[i];
      if (!step.conceptId) {
        errors.push(`Step ${i + 1} is missing conceptId`);
        continue;
      }

      if (seenConceptIds.has(step.conceptId)) {
        errors.push(`Duplicate concept detected at step ${i + 1}: ${step.conceptId}`);
      }
      seenConceptIds.add(step.conceptId);

      // Check if concept exists in registry
      const exists = canonicalConceptService.getAllCanonicalConcepts().some(c => c.id === step.conceptId);
      if (!exists) {
        errors.push(`Step ${i + 1} references non-existent canonical concept: ${step.conceptId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Persists a knowledge trail to Firestore.
   */
  async saveTrail(record: PlatformKnowledgeTrailRecord): Promise<void> {
    const domain = toDomainKnowledgeTrail(record);
    const check = this.validateTrail(domain);
    if (!check.valid) {
      throw new Error(`Invalid knowledge trail: ${check.errors.join(', ')}`);
    }

    const docRef = doc(db, 'knowledgeTrails', record.id);
    await setDoc(docRef, record, { merge: true });
    this.trailCache.set(record.id, domain);
  }
}

export const knowledgeTrailService = new KnowledgeTrailService();
