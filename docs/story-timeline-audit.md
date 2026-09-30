# Breakpoint Chronology & Story Evolution Audit

> **Inspection of Existing Chronology, Timeline, and Delta Constructs Across Breakpoint Platform**  
> **Source Base**: `C:\Users\Public\New67\` (`app`, `Cie-Daily-Studio`, `supabase/functions`)  
> **Desktop Base**: `c:\Users\Public\Desktop app news\`  
> **Audit Date**: 2026-09-29  

---

## 1. Executive Summary

A comprehensive scan across the Flutter mobile app, Cie-Daily-Studio publishing backend, Supabase Edge Functions, and Firestore security rules was conducted to identify any existing chronology, timeline, event-tracking, or delta-comparison systems.

**Key Findings**:
1. **Article Ordering Only**: The existing platform possessed only basic timestamp sorting utilities for individual articles in Flutter (`article_chronology.dart`).
2. **No Multi-Article Story Timeline**: No database structure or service existed for multi-article event sequencing or chronological timeline compilation.
3. **No Delta / "What Changed" Engine**: No capability existed to extract structured facts, compare state across updates, or identify what changed between articles.
4. **No "Since You Last Read" Derivation**: Reading progress was previously isolated per article (as audited in Phase 16A) with no bridge connecting reading timestamps to story evolution.

---

## 2. Codebase Inspection Results

### 1. `app/lib/features/discover/models/article_chronology.dart`
- **Purpose**: Provides client-side list sorting for `PostModel` articles.
- **Implementation**:
  ```dart
  int compareArticlesNewestFirst(PostModel left, PostModel right) {
    final byDate = right.chronologicalDate.compareTo(left.chronologicalDate);
    if (byDate != 0) return byDate;
    return left.id.compareTo(right.id);
  }
  ```
- **Rules Established**:
  - Primary sort key: `publishedAt` if present, falling back to `createdAt`.
  - Missing dates sort oldest (deterministic fallback).
  - `updatedAt` MUST NOT alter chronological news ordering (verified by `app/test/article_chronology_test.dart`).
- **Reusability**: The date comparison and fallback semantics (`publishedAt` $\to$ `createdAt`) should be preserved as the baseline chronological fallback when explicit event dates are not extracted from text.

### 2. `app/lib/features/discover/models/structured_article_model.dart`
- **Findings**: Contains static mock explore item text (`title: 'Milestones & Timeline'`) in sample mock data (`Founded 2017 → Series A ($4.5M) → Series B (₹130 Cr)`).
- **Verdict**: Strictly presentation mock data. No dynamic timeline parser or Firestore schema existed.

### 3. Grep Analysis for Timeline Keywords
- Keywords evaluated across the platform: `timeline`, `chronology`, `eventDate`, `relatedEvents`, `previousUpdate`, `latestUpdate`, `delta`, `revision`.
- **Findings**:
  - `delta`: Used exclusively in touch/scroll gesture mathematics (`notification.scrollDelta`, `_dragOffset += details.delta`) and puzzle rating updates (`AdaptivePuzzleScheduler.calculateRatingDelta`).
  - `revision` / `eventDate` / `relatedEvents`: 0 occurrences across backend and client repos.

---

## 3. Reusable Patterns & Architectural Directives

1. **Date Provenance Rule**:
   - Source articles often report events that happened prior to the publication date (e.g. "agreement was signed on Monday, Sep 27" in an article published Sep 29).
   - If an explicit event date is extracted from text with high confidence, set `occurredAt = extractedDate` and `datePrecision = 'exact_day'`.
   - If no explicit date is present in text, fall back to `occurredAt = article.publishedAt` with `datePrecision = 'publication_fallback'`.
   - Never hallucinate precise dates.

2. **Deduplication Over Duplication**:
   - Multiple articles frequently cover the exact same milestone (e.g., "Ather opens plant Monday" vs "Ather plant inaugurated").
   - Timeline generation must compute event signature similarity and attach additional supporting article IDs (`sourceArticleIds: [A, B]`) rather than generating duplicate timeline cards.

3. **Subcollection Storage**:
   - Subcollections under `stories/{storyId}`:
     - `stories/{storyId}/timeline/{timelineEventId}`
     - `stories/{storyId}/updates/{updateId}`
   - Provides clean document isolation, subcollection querying, and zero index pollution.
