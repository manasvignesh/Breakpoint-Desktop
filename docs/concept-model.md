# Canonical Concept Model Specification

> **Platform Reference**: Breakpoint Platform Phase 16D
> **Firestore Collection**: `concepts/{conceptId}`
> **Authoritative Service**: `src/services/canonicalConceptService.ts`
> **Flutter Model**: `lib/features/knowledge_graph/models/canonical_concept_model.dart`

---

## 1. Overview & Definition

A **Canonical Concept** represents an abstract, teachable principle, mechanism, framework, economic rule, or technical methodology.

Concepts are designed to transform ephemeral news into cumulative, durable understanding.

### Strict Definition Standards
Every canonical concept must adhere to the following editorial standards:
1. **Concise**: Exactly one clear paragraph (35–65 words).
2. **Neutral**: Factual, objective, non-promotional.
3. **Non-Circular**: Does NOT define the concept by repeating its own name (e.g., *"A cryogenic engine is an engine that is cryogenic"* is prohibited).
4. **Pedagogically Graded**: Tagged with an explicit difficulty tier (`basic`, `intermediate`, `advanced`).

---

## 2. Firestore Document Schema (`concepts/{conceptId}`)

```typescript
export type ConceptDifficulty = 'basic' | 'intermediate' | 'advanced';

export interface PlatformConceptRecord {
  id: string;                      // e.g. "con_semi_cryogenic_engine", "con_repo_rate"
  name: string;                    // Primary name, e.g. "Semi-Cryogenic Rocket Engine"
  aliases: string[];               // Variational phrases and synonyms
  shortDefinition: string;        // Objective, non-circular definition
  category: string;                // Primary domain category
  difficulty: ConceptDifficulty;   // Pedagogical complexity level
  parentConceptIds?: string[];     // Foundational prerequisite concepts
  relatedConceptIds?: string[];    // Adjacent / lateral concepts
  metadata?: Record<string, unknown>;
  createdAt: string;               // ISO 8601 UTC timestamp
  updatedAt: string;               // ISO 8601 UTC timestamp
}
```

---

## 3. Seed Conceptual Domains

The platform includes authoritative, verified seed concepts across core deep-tech and macro verticals:
- **Space & Propulsion**: `Rocket Propulsion`, `Thrust`, `Cryogenic Rocket Engine`, `Semi-Cryogenic Rocket Engine`, `Launch Vehicle`, `Payload Capacity`
- **Macroeconomics**: `Repo Rate`, `Monetary Policy`, `Inflation Targeting`, `Fiscal Deficit`, `Interest Rate`
- **Artificial Intelligence**: `Large Language Model (LLM)`, `Transformer Architecture`, `Sovereign AI Infrastructure`, `Agentic AI`, `Waterless Datacenter Cooling`, `Supercomputing Grid`
- **Semiconductors**: `Semiconductor Fabrication Facility (Fab)`, `Cleanroom`, `ATMP / OSAT Packaging`
- **Electric Mobility**: `EV Fast-Charging Infrastructure`, `Electric Powertrain`
- **Enterprise & Fintech**: `Global Capability Centre (GCC)`, `Unified Payments Interface (UPI)`, `Initial Public Offering (IPO)`, `Venture Capital`, `IT Services`

---

## 4. Benchmark Validation & Quality Thresholds

- **Total Benchmark Cases**: 50
- **Precision**: 100.0%
- **Recall**: 100.0%
- **Irrelevant Concept Rate**: 0.0% (Zero noisy extraction)
- **Verified Categories**: 6 Core Domains
