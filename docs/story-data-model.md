# Breakpoint Story Data Model Specification

> **Canonical Story Schema, Transport Interfaces, Database Relations, & Rules Reference**  
> **Source Base**: `src/types/platform.ts`, `src/types/domain.ts`, `src/services/mappers/storyThreadMapper.ts`  
> **Backend Base**: Firestore `stories/{storyId}` & `posts/{postId}`  
> **Version**: 1.0.0 (Evidence-Backed)  

---

## 1. Data Model Overview

The Breakpoint platform decouples individual published articles (`posts/{postId}`) from their parent real-world evolving story thread (`stories/{storyId}`).

```
                                 ┌──────────────────────────────┐
                                 │   stories/{storyId}          │
                                 │                              │
                                 │   id: "st_1727600000000_..." │
                                 │   title: "Ather Energy..."   │
                                 │   primaryCategory: "EV"      │
                                 │   status: "active"           │
                                 │   articleCount: 3            │
                                 │   articleIds: [A, B, C]      │
                                 │   lastArticlePublishedAt: ...│
                                 └──────────────┬───────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
  ┌─────────────────────────────┐┌─────────────────────────────┐┌─────────────────────────────┐
  │      posts/{postId_A}       ││      posts/{postId_B}       ││      posts/{postId_C}       │
  │                             ││                             ││                             │
  │ id: "00x1a7ggH09jA828I5qd"  ││ id: "13v4b9hhK10lB939J6re"  ││ id: "24w5c0iiL11mC040K7sf"  │
  │ title: "Ather announces..." ││ title: "Ather begins..."    ││ title: "Ather doubles..."   │
  │ publishedAt: T1             ││ publishedAt: T2             ││ publishedAt: T3             │
  │ storyId: "st_1727600000..." ││ storyId: "st_1727600000..." ││ storyId: "st_1727600000..." │
  └─────────────────────────────┘└─────────────────────────────┘└─────────────────────────────┘
```

---

## 2. Canonical Story Document Schema (`stories/{storyId}`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Canonical Story Identifier (Format: `st_<timestamp_ms>_<random_hex>`). |
| `title` | `string` | Yes | Canonical evolving story headline/title. |
| `summary` | `string` | Yes | Comprehensive synthesis of the story development across updates. |
| `primaryCategory` | `string` | Yes | Primary domain/category (e.g. `'Article'`, `'Technology'`, `'AI & ML'`, `'Energy'`). |
| `tags` | `string[]` | Yes | Topical tags associated with the story. |
| `entityIds` | `string[]` | Yes | Array of normalized canonical entity IDs (`['ent_ather_energy', 'ent_konarc']`). |
| `status` | `string` | Yes | Lifecycle state: `'developing'` \| `'active'` \| `'resolved'` \| `'archived'`. |
| `articleCount` | `number` | Yes | Total number of published articles attached to this story thread. |
| `articleIds` | `string[]` | Yes | Chronological or ordered array of attached Firestore `posts/{postId}` IDs. |
| `leadArticleId` | `string` | Yes | Firestore ID of the primary/lead article anchoring the story. |
| `firstArticlePublishedAt` | `Timestamp` | Yes | Publication timestamp of the earliest article in the thread. |
| `lastArticlePublishedAt` | `Timestamp` | Yes | Publication timestamp of the latest article update. |
| `createdAt` | `Timestamp` | Yes | Server timestamp when the story thread was seeded. |
| `updatedAt` | `Timestamp` | Yes | Server timestamp of the latest thread mutation or article attachment. |

---

## 3. Article Extension Schema (`posts/{postId}`)

To preserve 100% backward compatibility with existing mobile clients, Studio admin panels, and Edge Functions, the `posts` collection schema remains unchanged except for one optional, non-breaking field:

```typescript
interface PlatformArticleRecord {
  // ... all existing canonical fields preserved unchanged ...
  id: string;
  schema_version: number;
  status: 'approved' | 'published';
  category: string;
  title: string;
  quick_brief: QuickBriefContent;
  full_article: FullArticleContent;
  publishedAt: Timestamp;
  createdAt: Timestamp;
  bookmarkedBy: string[];
  likedBy: string[];
  
  // NEW OPTIONAL CANONICAL STORY REFERENCE
  storyId?: string; // e.g. "st_1727600000000_a1b2c3d4"
}
```

---

## 4. Identifier Format Specification (`storyId`)

The `storyId` format is structured to ensure temporal ordering, uniqueness, and cross-platform parsing safety:

```
Format: st_{timestamp_ms}_{random_hex_8}
Example: st_1727602381294_a8f9b201
```

- **Prefix (`st_`)**: Instantly identifies the document as a canonical story entity (distinguishing from `posts` SHA256 IDs, user UIDs, or list IDs).
- **Timestamp Component (`1727602381294`)**: Millisecond Unix epoch timestamp enabling lexicographical sorting by creation time.
- **Random Entropy (`a8f9b201`)**: 8-character random hexadecimal string preventing collisions across distributed publishers.

---

## 5. Domain & Transport Interfaces

### TypeScript Domain Model (`src/types/domain.ts`)
```typescript
export interface StoryThread {
  id: string;
  title: string;
  summary: string;
  primaryCategory: string;
  tags: string[];
  entityIds: string[];
  status: 'developing' | 'active' | 'resolved' | 'archived';
  articleCount: number;
  articleIds: string[];
  leadArticleId: string;
  firstArticlePublishedAt: string;
  lastArticlePublishedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

### Flutter / Dart Model (`app/lib/features/story_threads/models/story_thread_model.dart`)
```dart
class StoryThreadModel {
  final String id;
  final String title;
  final String summary;
  final String primaryCategory;
  final List<String> tags;
  final List<String> entityIds;
  final String status;
  final int articleCount;
  final List<String> articleIds;
  final String leadArticleId;
  final DateTime firstArticlePublishedAt;
  final DateTime lastArticlePublishedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  // ... fromFirestore / toMap implementation
}
```

---

## 6. Story Thread Lifecycle Mutations

The story lifecycle is managed via `src/services/storyThreadService.ts`:

1. **`createStoryThread(article, storyData?)`**:
   - Seeds a new `stories/{storyId}` document.
   - Sets `posts/{articleId}.storyId = storyId`.
2. **`attachArticleToStory(storyId, article)`**:
   - Executes atomic Firestore batch/transaction.
   - Appends `article.id` to `stories/{storyId}.articleIds`.
   - Increments `articleCount`.
   - Updates `lastArticlePublishedAt = article.publishedAt`.
   - Merges newly discovered entity IDs.
   - Sets `posts/{article.id}.storyId = storyId`.
3. **`mergeStoryThreads(primaryStoryId, secondaryStoryId)`**:
   - Merges two previously separated story threads.
   - Moves all `articleIds` from secondary to primary.
   - Updates all corresponding `posts` documents to point to `primaryStoryId`.
   - Marks `secondaryStoryId` status as `'archived'`.
4. **`splitStoryThread(storyId, articleIdsToSplit, newStoryTitle)`**:
   - Splits selected articles out of an existing thread into a newly generated thread.
   - Re-points affected `posts` to the new `storyId`.
   - Decrements `articleCount` and recalculates timestamps on the original story.

---

## 7. Security Rules & Database Indexing

### Firestore Security Rules (`firestore.rules`)
```javascript
// Stories Collection
match /stories/{storyId} {
  // Public read access for all users (mobile, desktop, web)
  allow read: if true;
  
  // Create / Update / Delete restricted to verified creators and staff admins
  allow create, update, delete: if isCreatorOrStaff() || isLegacyAdmin();
}
```

### Composite Indexes (`docs/firestore-indexes.md`)
- **Query 1**: List active stories sorted by recent activity:
  - Collection: `stories`
  - Fields: `status` (ASC), `lastArticlePublishedAt` (DESC)
- **Query 2**: Filter stories by category and recency:
  - Collection: `stories`
  - Fields: `primaryCategory` (ASC), `lastArticlePublishedAt` (DESC)
- **Query 3**: Query articles in a story thread:
  - Collection: `posts`
  - Fields: `storyId` (ASC), `publishedAt` (ASC)
- **Query 4**: Query timeline events in a story chronologically:
  - Collection: `stories/{storyId}/timeline`
  - Fields: `occurredAt` (ASC)
- **Query 5**: Query story updates chronologically:
  - Collection: `stories/{storyId}/updates`
  - Fields: `emittedAt` (ASC)

---

## 8. Subcollections: Timeline & Updates

```
stories/{storyId}
  ├── timeline/{timelineEventId} (PlatformTimelineEventRecord)
  └── updates/{updateId}         (PlatformStoryUpdateRecord)
```

1. **`timeline/{timelineEventId}`**: Stores chronological macro events and milestones extracted with strict zero-hallucination provenance.
2. **`updates/{updateId}`**: Stores granular factual deltas between consecutive articles in an evolving story, backing "Since You Last Read" continuity.
