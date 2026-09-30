# Knowledge State Signals & State Reduction

> **Platform Reference**: Breakpoint Platform Phase 16E  
> **Reducer Implementation**: `src/services/knowledgeStateReducer.ts`

---

## 1. Overview & Architecture

Clients do NOT directly assign derived states like `state = 'understood'` in UI components.

Instead:
1. User actions trigger a strongly-typed **`KnowledgeSignal`**.
2. A deterministic reducer **`reduceKnowledgeState(currentState, signal)`** computes the updated state.
3. The resulting record is persisted to `users/{uid}/knowledge/{conceptId}`.

```
+-------------------+        +----------------------------+        +--------------------+
|   User Action     | -----> |      KnowledgeSignal       | -----> | reduceKnowledge    |
| (e.g. Read Story) |        | (ARTICLE_COMPLETED, etc.)  |        |      State()       |
+-------------------+        +----------------------------+        +--------------------+
                                                                             │
                                                                             v
                                                                   +--------------------+
                                                                   | Persist Updated    |
                                                                   | UserKnowledge      |
                                                                   +--------------------+
```

---

## 2. Signal Types & Centrality Weighting

```typescript
export type KnowledgeSignalType =
  | 'ARTICLE_COMPLETED'       // Completed article reading
  | 'CONCEPT_OPENED'          // Opened concept modal or panel
  | 'EXPLANATION_REQUESTED'   // Requested deep explanation / MEDHA explanation
  | 'TRAIL_STEP_COMPLETED'    // Finished a step in a Knowledge Trail
  | 'TRAIL_COMPLETED'         // Finished entire Knowledge Trail
  | 'USER_KNOWS_CONCEPT'      // Explicit "I know this"
  | 'USER_REQUESTS_BASICS'    // Explicit "Explain from basics"
  | 'RESET_CONCEPT';          // Explicit reset request

export type ConceptCentrality = 'primary' | 'supporting' | 'incidental';

export interface KnowledgeSignal {
  type: KnowledgeSignalType;
  conceptId: string;
  occurredAt: string;          // ISO 8601 UTC timestamp
  conceptCentrality?: ConceptCentrality;
  sourceArticleId?: string;
  sourceTrailId?: string;
  stepIndex?: number;
}
```

---

## 3. State Reduction Rules

### A. Explicit User Overrides (Highest Priority)
- **`USER_KNOWS_CONCEPT`**:
  - `state` $\rightarrow$ `'understood'`
  - `confidence` $\rightarrow$ `0.95`
  - `explicitUserState` $\rightarrow$ `'know_this'`
  - `lastReinforcedAt` $\rightarrow$ `occurredAt`
- **`USER_REQUESTS_BASICS`**:
  - `explicitUserState` $\rightarrow$ `'learning'`
  - `state` $\rightarrow$ If previously `understood` $\rightarrow$ demotes to `familiar` (confidence `0.70`), ensuring foundational context is provided.
- **`RESET_CONCEPT`**:
  - Resets state to `'unseen'`, `confidence = 0.0`, `evidenceCount = 0`.

### B. Article Completion (`ARTICLE_COMPLETED`)
- **`incidental` Centrality**: Ignored (0 evidence added, no state promotion).
- **`primary` / `supporting` Centrality**:
  - If current state is `unseen` $\rightarrow$ becomes `exposed` (confidence `0.60`).
  - If current state is `exposed` and `evidenceCount >= 3` with at least 2 primary articles completed $\rightarrow$ becomes `familiar` (confidence `0.75`).
  - *Article completion alone never directly promotes from `exposed` to `understood`*.

### C. Concept Explanations (`CONCEPT_OPENED` / `EXPLANATION_REQUESTED`)
- Increments `explanationsOpened` and `lastInteractedAt`.
- If `unseen` $\rightarrow$ becomes `exposed` (confidence `0.50`).
- Requesting help/explanation is evidence of **curiosity**, not evidence of understanding. It never marks a concept as `understood`.

### D. Knowledge Trails (`TRAIL_STEP_COMPLETED` / `TRAIL_COMPLETED`)
- **`TRAIL_STEP_COMPLETED`**:
  - Promotes `unseen` / `exposed` $\rightarrow$ `familiar` (confidence `0.75`).
- **`TRAIL_COMPLETED`**:
  - Promotes `familiar` $\rightarrow$ `understood` (confidence `0.85`).
  - Promotes `exposed` $\rightarrow$ `familiar` (confidence `0.80`).
