# Breakpoint Platform Entity, Concept & Knowledge Audit
**Document Version**: 1.0 (Phase 16D)  
**Date**: September 2026  
**Status**: Authoritative Architectural Audit

---

## 1. Executive Summary

As Breakpoint transitions from single-article reading and story threads into structured knowledge accumulation, this audit examines how entities, concepts, topics, categories, and tags are currently represented across:
1. **Desktop Client** (`src/`)
2. **Flutter Mobile App** (`C:\Users\Public\New67\app`)
3. **Cie-Daily-Studio Content Pipeline** (`C:\Users\Public\New67\Cie-Daily-Studio`)
4. **Supabase Edge Functions & Medha Assistant** (`C:\Users\Public\New67\supabase/functions`)
5. **Cloud Firestore Rules & Indexes** (`firestore.rules`)

---

## 2. Audit Findings by Subsystem

### 2.1 Desktop Client (`src/`)
- **`src/services/entityExtractionService.ts`**:
  - Implemented in Phase 16B for story clustering.
  - Contains an in-memory dictionary `CANONICAL_ENTITIES` covering ~25 major Indian tech/business companies, organizations, and hubs (`ent_openai`, `ent_nvidia`, `ent_ather_energy`, `ent_isro`, `ent_fuel_cycle`, `ent_cdac`, `ent_npci`, `ent_rbi`, `ent_loc_bengaluru`, `ent_loc_hyderabad`, etc.).
  - Extracts normalized entities and computes Jaccard similarity between candidate stories.
  - *Gap*: Entities were purely local in-memory dictionaries for clustering; no canonical `entities/` collection exists in Firestore.
- **Concepts & Learning Paths**:
  - *Current State*: Zero concept representation existed in Desktop. Tags and topics were limited to high-level category strings (`AI & ML`, `Tech`, `Startups`, `Markets`, `Policy`).
  - *Opportunity*: Introduce `PlatformConceptRecord` and sequential `KnowledgeTrail`.

### 2.2 Flutter Mobile App (`C:\Users\Public\New67\app`)
- **`PublishedArticleModel` & `PostModel`**:
  - Contains `category` (e.g. `'Article'`), `articleCategory` (e.g. `'AI & ML'`), `tags` (optional string array in legacy schema), and `storyId` (added in Phase 16B).
  - *Gap*: No structured entity or concept models. Tags are uncurated ad-hoc strings without canonical IDs or definitions.
- **Medha Assistant (`features/medha/`)**:
  - `MedhaAssistantService` and `MedhaContext` pass article content, selected text, and basic question prompts to the `medha-chat` Edge Function.
  - *Opportunity*: Enrich Medha prompts with canonical concept definitions ("What is this?") and story-contextual explanations ("Why it matters here").

### 2.3 Cie-Daily-Studio Publishing Platform (`Cie-Daily-Studio`)
- **`src/lib/article-contract.ts` & `src/lib/types.ts`**:
  - Validates `quick_brief.category` (required single category) and `explore_sections` (in-depth narrative sections).
  - Authors write key facts (`key_stats`) and structured takeaways (`takeaways`).
  - *Gap*: Studio has no interface or validation for canonical entity linking or concept tagging. Authors write free-form text.

### 2.4 Supabase Functions (`supabase/functions/medha-chat`)
- Receives user context (`selectedText`, `articleText`, `conversationHistory`).
- Answers questions using Gemini LLM without grounding in a canonical knowledge graph.
- *Risk*: Without canonical concept definitions, LLM output can hallucinate, be overly verbose, or introduce circular definitions.

---

## 3. Ontological Taxonomy: Entity vs Concept

To prevent graph pollution and maintain pedagogical clarity, the platform strictly separates **Entities** from **Concepts**:

| Property | Canonical Entity (`entities/{id}`) | Canonical Concept (`concepts/{id}`) |
|---|---|---|
| **Definition** | Identifiable real-world object, company, person, place, or institution | An abstract idea, principle, technology, or mechanism someone needs to understand |
| **ID Prefix** | `ent_<stable_id>` (e.g. `ent_isro`, `ent_rbi`, `ent_nvidia`) | `con_<stable_id>` (e.g. `con_semi_cryogenic_engine`, `con_repo_rate`) |
| **Examples** | ISRO, RBI, Satya Nadella, Ather Energy, Navi Mumbai, MeitY | Repo rate, Semi-cryogenic propulsion, Large language model, GCC, Transformer, IPO |
| **Aliases** | Names, acronyms, ticker symbols (`"Reserve Bank of India"`, `"RBI"`) | Synonyms, technical shorthand (`"Repo"`, `"Repurchase Rate"`, `"Policy Rate"`) |
| **Disambiguation** | Critical: "Apple" (company vs fruit), "Meta" (company vs prefix) | Context-bound: "Transformer" (neural network vs electrical hardware) |
| **Primary Goal** | Grounding "Who / What is involved?" | Pedagogical: "What is this and how does it work?" |

---

## 4. Reusability & Architecture Decisions

1. **Reuse Existing Normalized Entity Dictionary**:
   - Promote `CANONICAL_ENTITIES` from `src/services/entityExtractionService.ts` to become the seed foundation of `canonicalEntityService.ts` and Firestore `entities/`.
2. **Introduce Canonical Concept Registry**:
   - Establish `concepts/` collection with short definitions (1–3 sentences), difficulty levels (`basic`, `intermediate`, `advanced`), and category taxonomies.
3. **Explicit Typed Knowledge Graph**:
   - Store typed, directional edges in `knowledgeEdges/{edgeId}` with mandatory `evidenceArticleIds` to ensure all factual relationships are grounded in reporting.
4. **Pedagogical Knowledge Trails**:
   - Store structured sequences in `knowledgeTrails/{trailId}` (3–6 steps).
   - Reject cyclic jumps, duplicate nodes, and arbitrary graph-neighborhood walks.
5. **Additive Article/Story Linkage**:
   - Add optional `entityIds?: string[]` and `conceptIds?: string[]` to `posts` and `stories`.
   - Existing articles without these arrays remain fully functional.
6. **Shadow Mode Operation**:
   - Run extraction and enrichment in shadow mode by default without mass-writing to existing Firestore articles.
