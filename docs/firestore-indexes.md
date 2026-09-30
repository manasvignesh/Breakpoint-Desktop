# Breakpoint Firestore Index Requirements

**Date:** 2026-09-29  
**Subsystems:** Published Feed (`posts`), Canonical Stories (`stories`), Shared Reading State (`users/{uid}/readingState`)

---

## 1. Stories Collection Index Strategy

### Canonical Collection: `stories/{storyId}`

| Field | Index Type | Query Purpose | Index Status |
|---|---|---|---|
| `status` | Single-field ASC/DESC | Filter developing vs stable vs closed stories | Default single-field |
| `primaryTopic` | Single-field ASC/DESC | Filter stories by category (e.g. AI & ML) | Default single-field |
| `lastUpdatedAt` | Single-field DESC | List most recently active story threads | Default single-field |
| `entityIds` | Array-contains | Candidate retrieval by normalized entity ID | Default single-field |
| `status` (ASC) + `lastUpdatedAt` (DESC) | Composite | Feed of active evolving stories sorted by freshness | Composite Index (Documented) |
| `primaryTopic` (ASC) + `lastUpdatedAt` (DESC) | Composite | Category-specific active story timeline | Composite Index (Documented) |

---

## 2. Posts Collection Index Strategy

### Canonical Collection: `posts/{postId}`

| Field | Index Type | Query Purpose | Index Status |
|---|---|---|---|
| `status` (ASC) + `category` (ASC) + `createdAt` (DESC) | Composite | Canonical feed queries (`status in ['approved', 'published']` where `category != 'Reel'`) | Production Active |
| `storyId` | Single-field ASC/DESC | Querying member articles belonging to a story thread | Default single-field |
| `storyId` (ASC) + `publishedAt` (ASC) | Composite | Chronological article timeline for a specific story thread | Composite Index (Documented) |
| `bookmarkedBy` | Array-contains | Saved Library queries for user bookmarks | Production Active |

---

## 3. Reading State Subcollection Index Strategy

### Subcollection: `users/{userId}/readingState/{articleId}`

| Field | Index Type | Query Purpose | Index Status |
|---|---|---|---|
| `updatedAt` | Single-field DESC | Fetching most recently read/interacted articles | Default single-field |
| `isCompleted` | Single-field ASC/DESC | Filtering in-progress vs completed articles | Default single-field |
| `isCompleted` (ASC) + `lastOpenedAt` (DESC) | Composite | "Jump back in" reading queue | Composite Index (Documented) |
