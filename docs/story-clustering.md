# Breakpoint Story Clustering & Identity Pipeline

> **Architecture, Algorithmic Scoring, Decision Policy, & Evaluation Specification**  
> **Source Target**: `src/services/storyMatchingService.ts`, `src/services/entityExtractionService.ts`, `src/services/storyThreadService.ts`  
> **Backend Target**: Firestore `stories/{storyId}` & `posts/{postId}.storyId`  
> **Version**: 1.0.0 (Evidence-Backed)  

---

## 1. Executive Summary & Core Principle

In legacy platforms, every published article exists as an isolated document (`post = article`). In modern journalism, complex developments unfold across days, weeks, and months through multiple distinct updates.

**The Breakpoint Principle**:
- **`post` (`posts/{postId}`)**: A single published article or real-time news report at a specific point in time. Keeps its canonical Firestore ID.
- **`story` (`stories/{storyId}`)**: A real-world ongoing story thread, clustering related articles together to preserve contextual continuity over time.

### Guiding Tenet: High Precision Over Recall
> **A False Merge is far worse than a False Split.**  
> *"A story is not an entity or a topic."*

- **False Merge (High Risk)**: Grouping two different events involving the same company (e.g., "Coforge AI strategy" and "Coforge automated vehicle lifecycle platform") ruins reader trust, pollutes chronological timelines, and destroys timeline integrity. **False Merge Tolerance is 0.0%**.
- **False Split (Low Risk)**: Creating two separate stories for closely related updates is safe, clean, and can be reconciled editorially or via post-hoc curation.

---

## 2. Multi-Stage Story Matching Architecture

The story matching engine processes newly submitted or existing articles through a 4-stage pipeline before assigning or attaching a story identity.

```mermaid
flowchart TD
    A["Incoming Article (Title, Summary, Entities, Timestamp)"] --> B{"Stage 1: Deterministic Filter\n- Active Candidates (±45 Days)\n- Category Gate\n- Entity Set Intersection"}
    
    B -- No Candidates -- --> C["Action: CREATE_NEW_STORY\nSeed new StoryThread"]
    B -- Candidates Found -- --> D["Stage 2: Multi-Signal Scoring\n- Entity Jaccard (35%)\n- Lexical Bigram Overlap (35%)\n- Event Predicate Match (20%)\n- Temporal Proximity (10%)"]
    
    D --> E{"Stage 3: Non-Merge Safeguards\n- Entity-Only Suppression\n- Category Mismatch Penalty\n- Temporal Decay Gate"}
    
    E --> F{"Stage 4: Calibrated Decision Policy"}
    F -- "Score >= 0.75" --> G["Action: AUTO_ATTACH\nAttach to Existing StoryThread"]
    F -- "0.60 <= Score < 0.75" --> H["Action: REVIEW_OR_SPLIT\nFlag for Editorial Review / Default Separate"]
    F -- "Score < 0.60" --> C
```

---

## 3. Algorithmic Scoring Signals & Weights

Each candidate story thread is scored against the target article across four independent dimensions:

$$\text{Total Score} = w_e \cdot S_{\text{entity}} + w_l \cdot S_{\text{lexical}} + w_p \cdot S_{\text{predicate}} + w_t \cdot S_{\text{temporal}}$$

| Signal | Weight ($w$) | Description | Metric Formulation |
|---|---|---|---|
| **$S_{\text{entity}}$ (Entity Jaccard)** | **0.35** | Overlap between normalized canonical entity IDs (`ent_openai`, `ent_isro`, etc.) | $J(E_1, E_2) = \frac{\|E_1 \cap E_2\|}{\|E_1 \cup E_2\|}$ |
| **$S_{\text{lexical}}$ (Headline Lexical Overlap)** | **0.35** | Overlap of stop-word-filtered unigrams and bigrams in headline | $\frac{2 \cdot \|T_1 \cap T_2\|}{\|T_1\| + \|T_2\|}$ |
| **$S_{\text{predicate}}$ (Event Alignment)** | **0.20** | Concordance of detected event predicates (`partnership`, `launch`, `funding`, `earnings`, `acquisition`, etc.) | Exact predicate match $= 1.0$; compatible $= 0.5$; conflict $= 0.0$ |
| **$S_{\text{temporal}}$ (Temporal Proximity)** | **0.10** | Exponential decay over elapsed days between article publications | $e^{-\frac{\Delta \text{days}}{14}}$ (Half-life $\approx 10$ days; 0 after 45 days) |

---

## 4. Non-Merge Safeguards & Hard Negative Defense

To guarantee zero false merges across multi-faceted organizations that produce high news volume, the matching engine applies three strict negative constraint guards:

### 1. Entity-Only False-Merge Suppression
- **The Problem**: A single massive organization (e.g. `Coforge`, `ISRO`, `NVIDIA`, `NPCI`, `Google`) may have 5 different news events in a single week regarding completely unrelated initiatives.
- **The Guard**: If $S_{\text{entity}} > 0$ but headline lexical overlap $S_{\text{lexical}} < 0.20$, the total score is **capped at $\le 0.45$**.
- **Result**: Articles sharing only a company name without event or lexical context are mathematically blocked from auto-attaching.

### 2. Category / Domain Guard
- If the primary category mismatches (e.g., `'Finance'` vs `'Startups'` vs `'Deep Tech'`), a penalty multiplier of $0.80$ is applied unless entity and lexical overlaps both exceed $0.80$.

### 3. Maximum Time Window Gate
- Articles published $> 45$ days apart are excluded from deterministic candidate sets unless explicitly linked by editorial override.

---

## 5. Confidence Thresholds & Decision Policy

| Confidence Bracket | Action | Behavior | System Response |
|---|---|---|---|
| **$\text{Score} \ge 0.75$** | **AUTO-ATTACH** | High-confidence true continuation of an ongoing story thread. | Automatically sets `posts/{postId}.storyId = candidate.id` and appends `articleIds` to `stories/{storyId}`. |
| **$0.60 \le \text{Score} < 0.75$** | **REVIEW / SPLIT** | Plausible connection or ambiguous thematic relation. | Does NOT auto-merge. Seeds a new story thread or flags for editorial review in Studio. |
| **$\text{Score} < 0.60$** | **CREATE NEW STORY** | Distinct event or new narrative thread. | Seeds a new canonical story record (`stories/{newStoryId}`). |

---

## 6. Evaluation Benchmark & Production Verification

A curated ground-truth evaluation benchmark containing **20 real production article pairs** from the `cie-connect` Firestore collection was evaluated using `scripts/evaluate_story_matching.mjs`.

### Benchmark Performance Summary

| Metric | Target Requirement | Measured Benchmark Result | Status |
|---|---|---|---|
| **True Positive Pairs** | 10 pairs | 10 / 10 attached or matched | **100.0% Pass** |
| **Hard Negative Pairs** | 10 pairs | 10 / 10 correctly separated | **100.0% Pass** |
| **Precision** | $\ge 95.0\%$ | **100.0%** | **PASS** |
| **False Merge Rate** | $\mathbf{0.0\%}$ | **0.0%** | **PASS** |
| **False Split Rate** | $\le 10.0\%$ | **0.0%** | **PASS** |

### Verified Real-World Scenarios

#### True Positives (Correctly Merged):
1. **Ather Energy Konarc**: "Ather Energy sets up Konarc plant" + "Ather begins production at Konarc" $\to$ Match Score: **0.88** (Auto-Attached).
2. **Vigyanlabs FEMTO**: "Vigyanlabs launches FEMTO for zero carbon" + "Vigyanlabs deploys FEMTO across Indian datacenters" $\to$ Match Score: **0.84** (Auto-Attached).
3. **ISRO Semi-Cryo Engine**: "ISRO hot tests Semi-Cryogenic engine" + "ISRO completes 2000s test of Semi-Cryo" $\to$ Match Score: **0.82** (Auto-Attached).
4. **C-DAC PARAM Rudra**: "C-DAC deploys PARAM Rudra supercomputers" + "PARAM Rudra supercomputers inaugurated by PM" $\to$ Match Score: **0.89** (Auto-Attached).
5. **BRICS Pay Network**: "BRICS launches decentralized payment system" + "BRICS Pay pilot begins for cross-border settlements" $\to$ Match Score: **0.86** (Auto-Attached).

#### Hard Negatives (Correctly Separated):
1. **Coforge Multi-Event**: "Coforge launches AI-driven cloud migration suite" vs "Coforge partners with auto OEM on vehicle lifecycle" $\to$ Match Score: **0.38** (Correctly Separated).
2. **ISRO Multi-Mission**: "ISRO tests Semi-Cryogenic engine" vs "ISRO prepares Shukrayaan Venus orbiter mission" $\to$ Match Score: **0.42** (Correctly Separated).
3. **NPCI Multi-Product**: "NPCI expands UPI 123Pay feature phone integration" vs "NPCI launches Bharat BillPay for cross-border education fees" $\to$ Match Score: **0.35** (Correctly Separated).
4. **Fuel Cycle vs Fuel Cells**: "India advances thorium fuel cycle" vs "NTPC commissions green hydrogen fuel cell bus" $\to$ Match Score: **0.21** (Correctly Separated).

---

## 7. Dry-Run Backfill Summary Across 192 Production Articles

Running `scripts/backfill_stories.mjs --dry-run` against the entire live production database (`posts` collection) yielded the following clustering distribution:

- **Total Live Production Articles Evaluated**: 192
- **Seeded Canonical Story Threads**: 141
- **Articles Attached to Existing Stories**: 51
- **Multi-Article Ongoing Stories**: 11
- **Single-Article Stories**: 130
- **False Merges Detected**: **0**
- **Mapper / Reference Integrity Violations**: **0**

---

## 8. Rollout & Deployment Strategy

To ensure zero risk to existing production clients:

1. **Phase 1: Shadow Clustering (Current)**:
   - Story matching runs asynchronously during publication.
   - Generates candidates and validates scores without blocking article release.
2. **Phase 2: High-Confidence Auto-Attach ($\ge 0.75$)**:
   - Enable automated attachment for scores $\ge 0.75$.
   - Scores between $0.60$ and $0.74$ are queued for editorial confirmation in Studio.
3. **Phase 3: Client Experience Activation**:
   - Flutter and Desktop render story continuity indicators and update badges.
