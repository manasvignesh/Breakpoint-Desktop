# Breakpoint Brief Ranking Engine Specification

> **Document Version**: 1.0 (Phase 16F)  
> **Status**: Authoritative Architectural Standard  
> **Date**: September 2026

---

## 1. Overview & Complexity Targets

The Breakpoint Brief Ranking Engine is a **Zero-LLM, deterministic personal scoring engine**.

### Computational Complexity:
- **Canonical Candidate Pool Extraction**: $O(N)$ once per daily edition (where $N$ is the number of active articles/stories in 24–48h). Pool extraction latency: $< 1\text{ ms}$.
- **Per-User In-Memory Ranking**: $O(U \times K)$ (where $U$ is the user count and $K$ is the candidate pool size $\approx 50-100$). Latency per user: $< 0.05\text{ ms}$.

---

## 2. Deterministic Scoring Formula

For each eligible candidate item $c$ and user context $u$:

$$\text{Score}(c, u) = W_{\text{editorial}} \cdot S_{\text{editorial}} + W_{\text{freshness}} \cdot S_{\text{freshness}} + W_{\text{continuing}} \cdot S_{\text{continuing}} + W_{\text{follow}} \cdot S_{\text{follow}} + W_{\text{interest}} \cdot S_{\text{interest}} + W_{\text{knowledge}} \cdot S_{\text{knowledge}}$$

### Weight Configuration:
- **$W_{\text{editorial}} = 0.30$**: Based on editorial flags (`isBreaking`, `isFeatured`, `importance`, `updatesCount`). Range: $0.10 - 1.00$.
- **$W_{\text{freshness}} = 0.20$**:
  - $\le 6\text{h}$: $1.00$
  - $6-12\text{h}$: $0.85$
  - $12-24\text{h}$: $0.70$
  - $24-48\text{h}$: $0.40$
  - $> 48\text{h}$: $0.15$
- **$W_{\text{continuing}} = 0.30$**: $+0.35$ boost when user previously read an article in this story thread AND new material facts (`materialChangesCount > 0`) have occurred.
- **$W_{\text{follow}} = 0.25$**: $+0.25$ boost when candidate mentions an entity in user's `followedEntityIds`.
- **$W_{\text{interest}} = 0.15$**: $+0.15$ boost when candidate topic matches user's `preferredCategories` or `interests`.
- **$W_{\text{knowledge}} = 0.15$**: $+0.20$ for knowledge trails or $+0.10$ for stories introducing concepts marked as `unseen` or `exposed`.

---

## 3. Suppression & Diversity Rules

### 3.1 Hard Suppression (Consumed Unchanged)
If:
$$\text{userReadingState}(c.\text{articleId}).\text{progress} \ge 0.90 \quad \text{AND} \quad c.\text{materialChangesCount} == 0$$
Then candidate $c$ is **strictly suppressed** (Score $= 0.0$).

### 3.2 Story-Level Deduplication
At most **1 item per story thread** is admitted into the final daily brief. Multiple articles covering the same breaking story collapse into a single top representation.

### 3.3 Category Diversity Soft Penalty
If 2 items of a specific category are already selected into the candidate list, subsequent candidates of that same category receive a $0.6\times$ penalty unless backfill is required to meet the minimum 5 items.

### 3.4 Guaranteed Outside Bubble Slot
If the brief has $\ge 4$ items, the lowest ranked non-essential item is replaced by the highest quality candidate from outside the user's followed topics and top categories, assigned `reasonCode = 'outside_bubble'`.
