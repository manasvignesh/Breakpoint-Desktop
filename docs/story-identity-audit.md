# Breakpoint Platform Audit: Story Identity & Clustering Subsystems

**Date:** 2026-09-29  
**Scope:** `C:\Users\Public\New67\` (Flutter App, Cie-Daily-Studio, Supabase Functions, Firestore Rules) & Desktop Client.

---

## 1. Executive Summary

A comprehensive, keyword-level and semantic audit was conducted across the entire Breakpoint platform codebase to discover any existing concepts of story identity, thread clustering, series grouping, or article relationships.

**Findings:**
- Zero cloud collections, database tables, or Edge Functions exist for story clustering, threads, or groupings.
- The `posts` collection in Firestore operates purely as a flat collection of standalone articles (`post = article`).
- The Flutter mobile client, CIE Daily Studio, and Supabase functions currently treat every document in `posts/{postId}` as an isolated entity with no parent or sibling relationships.
- There are no existing fields named `storyId`, `clusterId`, `threadId`, `seriesId`, `relatedPosts`, `relatedArticles`, `ongoingStory`, `storyGroup`, or `canonicalStory` in any data model.

---

## 2. Subsystem Audit Matrix

| Subsystem | Inspected Locations | Searched Concepts | Current State / Finding |
|---|---|---|---|
| **Firestore Database** | Live `cie-connect` Firestore, `firestore.rules` | `stories`, `threads`, `clusters`, `series` | **None.** No `stories` collection exists. Root rules only define `posts`, `reels`, `live_spaces`, `liveStreams`, `follows`, `connections`, `users`, `comments`. |
| **Flutter Mobile Client** | `lib/features/discover/models/`, `lib/features/feed/models/` | `storyId`, `clusterId`, `seriesId`, `related` | **Flat Article Model.** `PublishedArticle` and `PostModel` hold only single-article schema v2 fields. `article_chronology.dart` performs only date-based sorting of individual posts. |
| **CIE Daily Studio** | `src/lib/types.ts`, `src/lib/article-contract.ts` | `storyId`, `cluster`, `series`, `related` | **No Story Grouping.** Publishing output `toPublishedPost` outputs single post documents with `status: 'approved'`. No story association logic exists. |
| **Supabase Edge Functions** | `supabase/functions/publish-content/` | `storyId`, `cluster`, `thread` | **Direct Post Creation.** `publish-content` writes directly to `posts/{deterministicId}` and notifies followers. No clustering trigger or story resolution exists. |
| **Desktop Client** | `src/types/platform.ts`, `src/types/domain.ts` | `storyId`, `thread` | **Domain `Story` = Article.** The term `Story` was previously used as the domain name for single article records. No canonical multi-article thread existed. |

---

## 3. Ambiguities & Naming Conflicts Discovered

### A. "Story" Nomenclature Collision
- In the desktop codebase (`src/types/domain.ts`), the interface representing a single article was named `Story` (e.g. `interface Story { id: string; title: string; ... }`).
- In the canonical Breakpoint architecture:
  - **Post / Article (`posts/{postId}`)**: A single published article or piece of content.
  - **Story / StoryThread (`stories/{storyId}`)**: An ongoing real-world development spanning multiple articles over time.
- **Resolution**:
  - Keep `PlatformArticleRecord` and `Story` (or `Article`) for single post articles.
  - Introduce `PlatformStoryRecord` (transport) and `StoryThread` (domain) for the multi-article canonical story cluster.
  - Add optional `storyId?: string` to `PlatformArticleRecord` and optional `storyId?: string` (or `storyThreadId`) to `Story`.

### B. Library Item `storyId` Reference
- In `src/types/domain.ts`, `interface LibraryItem { storyId: string; ... }` uses `storyId` to refer to the bookmarked article's ID (`postId`).
- **Resolution**:
  - Preserve `LibraryItem.storyId` mapping to `postId` for backward compatibility with bookmark collections (`posts/{postId}.bookmarkedBy`), while using `storyThreadId` or distinct `canonicalStoryId` when referencing the parent story thread.

---

## 4. Conclusion & Architectural Recommendation

Because zero story clustering logic currently exists in the platform:
1. We can cleanly introduce `stories/{storyId}` as a first-class Firestore collection without breaking or migrating any legacy collections.
2. We must add optional `storyId` to `posts/{postId}` without breaking existing Flutter or Studio clients.
3. Matching and clustering should be designed as a hybrid, high-precision pipeline with shadow-mode and dry-run safety.
