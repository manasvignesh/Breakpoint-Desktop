# Breakpoint Daily Brief & Finite Discovery Audit

> **Document Version**: 1.0 (Phase 16F)  
> **Status**: Authoritative Architectural Audit  
> **Date**: September 2026

---

## 1. Executive Summary

As Breakpoint introduces the **Daily Brief and Finite Personalized Discovery** layer, this audit reviews the existing feeds, recommendation mechanisms, reading state trackers, timeline changes, entity follow graphs, and personal knowledge stores across Breakpoint Desktop, Mobile (Flutter), and Firestore (`cie-connect`).

### Core Audit Findings:
1. **Current Feed is Infinite / Unsegmented**:
   - The current Discover tab displays a single stream of stories/articles ordered primarily by publication time or basic category filters.
   - Users encounter fatigue without a clear stopping point ("Caught Up").
2. **Story Clustering & Delta Engine are Fully Operational**:
   - Canonical `stories/`, article timelines (`posts/{id}.timeline`), and factual changes (`storyChanges/`) exist in Firestore.
   - However, they have not yet been condensed into a morning/evening finite digest.
3. **Reading State & Knowledge State are Authoritative**:
   - `users/{uid}/readingState/{articleId}` tracks exact reading progress (0.0 to 1.0).
   - `users/{uid}/knowledgeState/{conceptId}` tracks concept familiarity (`unseen`, `introduced`, `reinforcing`, `familiar`, `mastered`).
   - `users/{uid}/userFollows/{targetId}` tracks explicit topic/entity follows.
4. **Zero-LLM Fast Deterministic Ranking is Required**:
   - Daily briefs must be generated in milliseconds without per-user LLM calls, ensuring 100% transparent and reproducible selection.

---

## 2. Subsystem Audit Details

### 2.1 Story Clustering & Deduplication
- **Current State**: Articles with the same `storyId` represent evolving story threads.
- **Risk Identified**: If multiple articles belong to the same breaking story (e.g. 3 updates in 24 hours), naive feeds display all 3 articles.
- **Phase 16F Requirement**: Strict story-level deduplication. Exactly **1 item per story thread** must appear in any single daily brief.

### 2.2 Reading State & Suppression
- **Current State**: Articles with `progress >= 0.90` are marked as completed.
- **Risk Identified**: Showing already-consumed stories when no new material facts have been published frustrates users.
- **Phase 16F Requirement**:
  - If a story was consumed (`progress >= 0.90`) and has **no changes** or only `additional_detail` / non-material updates, it is **strictly suppressed** from the brief.
  - If a story was consumed but has **material new changes** (`value_changed`, `new_fact`, `status_changed`, `correction`), it is presented as a **`story_update`** with "Since You Last Read" delta highlights.

### 2.3 Candidate Pool vs Per-User Querying
- **Current Architecture**: Querying the full corpus for every active user leads to O(U x N) Firestore reads.
- **Phase 16F Optimized Pipeline**:
  1. **Canonical Daily Candidate Pool** (O(N)): Evaluates active stories, recent approved articles (last 24–48h), and active knowledge trails once.
  2. **In-Memory Personal Ranking** (O(U x K)): Ranks candidates in-memory against user followings, reading state, and knowledge state in < 50ms with zero LLM overhead.

### 2.4 Interest vs Knowledge Separation
- **Interest Boundary**: Controls **what** content appears in the brief (topics, followed entities, breaking editorial priorities).
- **Knowledge Boundary**: Controls **how deep** background context is provided (standard, primer, compact delta, deep dive). News facts are never altered or personalized.

---

## 3. Finite Digest Architecture & Endpoint

- **Target Size**: 5 to 8 high-impact items (~5 to 10 minutes read time).
- **Finite Stopping Point**: When the user finishes the last item, the reader transitions to a calm **"YOU'RE CAUGHT UP"** confirmation screen.
- **No Infinite Fallback**: No infinite recommendations below the brief; no gamified streak pressure.
