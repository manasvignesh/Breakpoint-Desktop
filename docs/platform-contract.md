# Breakpoint Platform Contract

> **Canonical System Specification & Platform Integration Reference**
> **Source Base**: `C:\Users\Public\New67\` (`app`, `Cie-Daily-Studio`, `supabase/functions`)
> **Environment & Identity Target**: Firebase Project `cie-connect` · Supabase Functions `fuvquwhphuheqgfdmtbh`
> **Version**: 2.0.0 (Evidence-Backed)

---

## 1. Authentication

### Source Evidence
- **Flutter App**: `app/lib/features/auth/data/auth_repository.dart`, `app/lib/core/services/trusted_backend_client.dart`
- **Studio Web**: `Cie-Daily-Studio/src/lib/firebase.ts`, `Cie-Daily-Studio/server.ts`
- **Supabase Edge Functions**: `supabase/functions/_shared/firebase.ts`

### Symbols & Implementations
- `FirebaseAuth.instance`
- `AuthRepository.signInWithEmailAndPassword(email, password)`
- `User.getIdToken(forceRefresh)`
- `verifyFirebaseUser(request: Request): Promise<VerifiedFirebaseUser>`
- `createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"))`

### Existing Production Behavior
1. **Identity Provider**: Firebase Authentication (Project ID: `cie-connect`).
2. **Canonical Primary Key**: `user.uid` (Firebase UID, standard 28-character alphanumeric string).
3. **Login Methods**: Email & password (`signInWithEmailAndPassword`), Password reset flow (`sendPasswordResetEmail`, `confirmPasswordReset`), and Google Sign-in on mobile.
4. **Token Refresh**: Client calls `user.getIdToken(true)` to refresh expired JWTs. `TrustedBackendClient` automatically forces a token refresh and retries once if any backend call returns HTTP 401.
5. **Transport Attachment**: Client sends `Authorization: Bearer <firebaseIdToken>` header with every HTTPS request to Supabase Edge Functions or Studio APIs.
6. **Backend Verification**: Supabase Edge Functions do not use proprietary session tokens. They verify the Firebase ID Token cryptographically using `jose.jwtVerify` against Google's public JWK set (`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`), validating `RS256` signature, `audience: cie-connect`, and `issuer: https://securetoken.google.com/cie-connect`.
7. **Session Lifecycle**: `FirebaseAuth.instance.signOut()` invalidates local credentials.

### Desktop Integration Rules
- **Rule AUTH-01**: The Desktop application MUST use the identical Firebase Project ID (`cie-connect`) and initialize the official Firebase JS SDK v11 Auth module.
- **Rule AUTH-02**: The Desktop application MUST preserve the user's Firebase UID (`user.uid`). It MUST NOT create an auxiliary or secondary user database.
- **Rule AUTH-03**: All calls to Supabase Edge Functions or Studio endpoints MUST attach the valid Firebase ID token as `Authorization: Bearer <idToken>`.

---

## 2. Articles & Canonical Content Schema

### Source Evidence
- **Studio Contract**: `Cie-Daily-Studio/src/lib/article-contract.ts`, `Cie-Daily-Studio/src/lib/types.ts`
- **Mobile Models**: `app/lib/features/discover/models/published_article_model.dart`, `app/lib/features/discover/models/structured_article_model.dart`, `app/lib/features/discover/models/article_attribution.dart`, `app/lib/features/feed/models/post_model.dart`
- **Backend Publish**: `supabase/functions/publish-content/index.ts`

### Symbols & Definitions
- `PublishedArticle`, `QuickBriefContent`, `FullArticleContent`, `ExploreSectionContent`, `KeyStatContent`, `QuoteContent`, `LocalizedArticleContent`, `ArticleAttribution`
- Canonical Schema Version: `schema_version: 2`

### Canonical Article Structure (`posts/{postId}`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Firestore Document ID (deterministic SHA256 or auto-ID). |
| `schema_version` | `number` | Yes | `2` for modern structured stories; `1` for legacy unstructured blocks. |
| `status` | `string` | Yes | `'approved'` or `'published'` for live articles; `'draft'` or `'pending'` for unpublished. |
| `category` | `string` | Yes | Main category (e.g. `'Article'`, `'Technology'`, `'STARTUPS'`, `'AI & ML'`). |
| `articleCategory`| `string` | Optional | Sub-category tag. |
| `title` | `string` | Yes | Headline for feed cards and list views. |
| `headline` | `string` | Yes | Headline mirror. |
| `quick_brief` | `object` | Yes (v2) | Structured quick summary card deck data. |
| `quick_brief.category` | `string` | Yes | Deck category label. |
| `quick_brief.headline` | `string` | Yes | Concise deck card headline (4+ words). |
| `quick_brief.quick_summary` | `string` | Yes | 35–60 word narrative summary. |
| `quick_brief.three_things_to_know` | `string[]` | Yes | Exactly 3 key facts / highlights. |
| `quick_brief.key_number` | `{ value: string, label: string } \| null` | Optional | Hero statistic or numerical callout. |
| `full_article` | `object` | Yes (v2) | In-depth reader content structure. |
| `full_article.headline` | `string` | Yes | Long-form story headline. |
| `full_article.hook` | `string` | Yes | Lead sentence / narrative hook (8+ words). |
| `full_article.in_20_seconds` | `string` | Yes | Rapid 20-second takeaway synopsis. |
| `full_article.what_happened` | `string` | Yes | Comprehensive event breakdown (60+ words). |
| `full_article.why_this_matters` | `string` | Yes | Structural analysis / industry context (50+ words). |
| `full_article.bigger_picture` | `string` | Optional | Long-term macro trajectory. |
| `full_article.key_stats` | `Array<{ value: string, label: string }>` | Yes | Array of quantitative metrics. |
| `full_article.explore_sections` | `Array<{ title: string, summary: string, content: string, items: Array<{ title: string, description: string }> }>` | Yes | 2–6 thematic deep-dive sections. |
| `full_article.takeaways` | `string[]` | Yes | 3–5 final bullet takeaways. |
| `full_article.quote` | `{ text: string, speaker: string, role: string } \| null` | Optional | Direct quote attribution. |
| `imageUrl` | `string` | Yes | Primary hero image URL. |
| `thumbnailUrl` | `string` | Optional | Thumbnail image URL. |
| `coverImage` | `string` | Optional | Cover image URL. |
| `mediaUrls` | `string[]` | Yes | Array of media assets. |
| `sourceType` | `string` | Yes | `'external' \| 'original' \| 'press_release' \| 'official_source' \| 'aggregated'` |
| `originalPublisher`| `string` | Yes | Source publisher (or `'Breakpoint'` if original). |
| `originalSourceUrl`| `string` | Optional | External source URL (must be valid HTTP/HTTPS). Empty for original. |
| `sourceName` | `string` | Optional | Alias for `originalPublisher`. |
| `sourceUrl` | `string` | Optional | Alias for `originalSourceUrl`. |
| `breakpointEditor`| `string` | Optional | Editorial desk label (e.g. `'Breakpoint Editorial'`). |
| `authorId` | `string` | Yes | Firebase UID of creator / staff author. |
| `authorName` | `string` | Yes | Author display name. |
| `authorAvatar` | `string \| null` | Optional | Author avatar URL. |
| `authorEmail` | `string \| null` | Optional | Author email. |
| `author` | `object` | Optional | Map with `{ name, fullName, avatarUrl, email }`. |
| `likesCount` | `number` | Yes | Total like tally. |
| `likedBy` | `string[]` | Yes | Array of user UIDs who liked the post. |
| `bookmarkedBy` | `string[]` | Yes | Array of user UIDs who saved/bookmarked the story. |
| `commentsCount` | `number` | Yes | Total comment count. |
| `estimatedReadTime`| `number` | Yes | Estimated read time in minutes. |
| `isTodaysDrop` | `boolean` | Optional | Featured in daily drop carousel. |
| `isFeatured` | `boolean` | Optional | Featured priority flag. |
| `deckPriority` | `number` | Optional | Order rank in brief decks (lower = higher priority). |
| `languages` | `Record<string, LocalizedArticle>` | Optional | Localized versions keyed by language ID (`'en'`, `'hi'`, `'te'`). |
| `createdAt` | `Timestamp` | Yes | Server timestamp of creation. |
| `publishedAt` | `Timestamp` | Yes | Publication timestamp. |
| `updatedAt` | `Timestamp` | Optional | Last update timestamp. |

### Desktop Integration Rules
- **Rule ART-01**: The Desktop client MUST read articles from the Firestore `posts` collection where `category != 'Reel'` and `status in ['approved', 'published']`.
- **Rule ART-02**: The Desktop client MUST support both Schema v2 (`quick_brief` + `full_article`) and gracefully synthesize Schema v1 legacy articles via canonical fallback mappings.
- **Rule ART-03**: The Desktop client MUST NOT mutate the production article schema or alter existing article IDs.

---

## 3. Users & Profile System

### Source Evidence
- **Firestore Path**: `users/{userId}`
- **Security Rules**: `firestore.rules` (lines 154–166)
- **Mobile Model**: `app/lib/features/user/data/firebase_user_repository.dart`

### Existing Document Schema (`users/{userId}`)

| Field | Type | Description |
|---|---|---|
| `name` / `fullName` | `string` | User display name. |
| `email` | `string` | User email address. |
| `photoUrl` / `avatarUrl` | `string \| null` | Profile picture URL. |
| `bio` | `string` | Brief user bio. |
| `role` | `string` | Role identifier (`'student'`, `'creator'`, `'admin'`, `'editor'`). |
| `department` | `string` | College department / branch (e.g. `'CSE'`). |
| `yearOfStudy` | `string` | Academic year (e.g. `'3rd Year'`). |
| `interests` | `string[]` | Selected interest tags (up to 8). |
| `followers` | `string[]` | Array of follower UIDs. |
| `following` | `string[]` | Array of following UIDs. |
| `followersCount` | `number` | Follower count. |
| `followingCount` | `number` | Following count. |
| `connectionCode` | `string` | Unique 6-character connection code for student discovery. |
| `notificationPreferences` | `object` | Settings: `{ enabled: boolean, creatorContent: boolean, messagePreviews: boolean }`. |
| `createdAt` | `Timestamp` | Account creation timestamp. |
| `updatedAt` | `Timestamp` | Last profile update timestamp. |

### Subcollections
- `users/{userId}/fcmTokens/{tokenId}`: Device push tokens with `{ token, uid, platform, updatedAt }`.

### Desktop Integration Rules
- **Rule USR-01**: User profiles are stored at `users/{userId}` where `userId == auth.currentUser.uid`.
- **Rule USR-02**: Profile edits must restrict writes to the user's own document (`request.auth.uid == userId`).

---

## 4. Firestore Collections Matrix

| Collection Path | Purpose | Read Rule | Write Rule | Mobile / Desktop Consumer |
|---|---|---|---|---|
| `posts/{postId}` | Articles, news stories, and reels | `allow read: if true;` (Public) | Creator / Admin or users toggling `likedBy`/`bookmarkedBy` | Discover, Feed, Library, Search |
| `users/{userId}` | User profile and preferences | Signed-in users | Owner (`auth.uid == userId`) or Admin | Profile, Settings, Connections |
| `users/{userId}/fcmTokens/{tokenId}` | Device FCM tokens | Owner | Owner | Notification service |
| `follows/{followId}` | Follow relationships (`${followerId}_${targetId}`) | Signed-in users | Signed-in owner (`followerId == auth.uid`) | User profile, Feed recommendations |
| `articleLists/{listId}` | Curated / user reading lists | Signed-in users | Signed-in owner | Lists, Library |
| `conversations/{conversationId}` | 1-to-1 and group chats | Participants | Participants | Chat screen |
| `conversations/{id}/messages/{msgId}` | Chat messages | Participants | Sender | Chat messaging |
| `connection_requests/{requestId}` | Student connection requests | Participants | Sender create / Receiver update | Connections UI |
| `connections/{connectionId}` | Established connections | Signed-in users | Signed-in users | Connections UI |
| `notifications/{notificationId}` | User notifications | Signed-in users | Admin / Backend / Functions | Notification center |
| `live_spaces/{spaceId}` | Live audio/video spaces | Signed-in users | Creator host / Admin | Spaces feature |
| `liveStreams/{streamId}` | Live streaming rooms | Signed-in users | Creator host / Admin | Live stream feature |
| `comments/{commentId}` | Article and post comments | Signed-in users | Author create / Admin | Article discussion |

---

## 5. Supabase Edge Functions

### Source Evidence
- **Directory**: `supabase/functions/`
- **Base Endpoint**: `https://fuvquwhphuheqgfdmtbh.supabase.co/functions/v1`

### Function Registry

#### 1. `publish-content`
- **Route**: `POST /publish-content`
- **Purpose**: Server-validated publication of articles and reels with automatic follower notifications.
- **Auth**: Firebase Bearer token verified via Google JWK. Must have `admin`/`creator` role or email in `CREATOR_EMAILS`.
- **Request Payload**:
  ```json
  {
    "clientContentId": "string (max 100)",
    "post": {
      "title": "string",
      "category": "Article",
      "sourceType": "external | original",
      "originalPublisher": "string",
      "originalSourceUrl": "https://...",
      "publishedAt": "2026-09-29T11:00:00Z",
      "quick_brief": { ... },
      "full_article": { ... }
    }
  }
  ```
- **Response**: `{ "ok": true, "postId": "string", "created": boolean, "published": boolean, "notified": number }`
- **Error Codes**: `400 invalid_request`, `400 invalid_attribution`, `401 unauthenticated`, `403 forbidden`, `409 idempotency_conflict`.

#### 2. `send-message`
- **Route**: `POST /send-message`
- **Purpose**: Durable chat message delivery with transactional unread increments and background FCM push dispatch.
- **Auth**: Firebase Bearer token.
- **Request Payload**:
  ```json
  {
    "conversationId": "string",
    "content": "string (max 4000)",
    "clientMessageId": "string (8-100 chars)",
    "senderId": "string (must match auth UID)"
  }
  ```
- **Response**: `{ "ok": true, "messageId": "string", "created": boolean, "durable": true }`

#### 3. `medha-chat`
- **Route**: `POST /medha-chat`
- **Purpose**: Socratic AI reading assistant and puzzle tutor grounded in Breakpoint stories.
- **Auth**: Firebase Bearer token.
- **Request Payload**:
  ```json
  {
    "requestId": "uuid-string",
    "question": "string",
    "companion": "kiro | lumi | momo | zuzu | nishi",
    "context": {
      "articleTitle": "string",
      "articleSummary": "string",
      "category": "string",
      "keyNumbers": ["string"]
    },
    "chunks": [{ "text": "string", "source": "currentStory" }],
    "history": [{ "role": "user | assistant", "content": "string" }]
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "scope": "inScope | relatedExtension | outOfScope",
    "sections": [{ "kind": "currentStory | relatedBreakpoint | general | outOfScope", "text": "string" }]
  }
  ```

#### 4. `nearby-people`
- **Route**: `POST /nearby-people`
- **Purpose**: Ephemeral proximity student discovery using rotating 64-bit random session tokens.

#### 5. `nfc-connect`
- **Route**: `POST /nfc-connect`
- **Purpose**: High-speed physical tap pairing and mutual connection establishment.

---

## 6. Storage

### Source Evidence
- **Supabase Storage**: Bucket `article-audio`
- **Firebase Storage**: Bucket `cie-connect.firebasestorage.app`

### Existing Behavior
1. **Article Narration Audio**: Stored in Supabase Storage bucket `article-audio`.
   - Object Path: `articles/${encodeURIComponent(articleId)}/${languageId}.wav`
   - Public CDN URL: `https://fuvquwhphuheqgfdmtbh.supabase.co/storage/v1/object/public/article-audio/articles/${encodeURIComponent(articleId)}/${languageId}.wav`
2. **User Avatars & Media Assets**: Stored in Firebase Storage (`cie-connect.firebasestorage.app`) or Unsplash CDN.

---

## 7. Localization

### Source Evidence
- `Cie-Daily-Studio/src/lib/languages.ts`
- `Cie-Daily-Studio/src/lib/localization.ts`
- `app/lib/core/constants/supported_languages.dart`

### Supported Languages

| Code | Sarvam Code | Name | Native Label | Speaker | TTS Enabled |
|---|---|---|---|---|---|
| `en` | `en-IN` | English | English | `ritu` | Yes (Source) |
| `hi` | `hi-IN` | Hindi | हिन्दी | `priya` | Yes |
| `te` | `te-IN` | Telugu | తెలుగు | `priya` | Yes |

### Document Storage Format
Localized content is nested directly in the article document under `languages`:
```typescript
languages: {
  hi: {
    title: "...",
    quick_brief: { category: "...", headline: "...", quick_summary: "...", three_things_to_know: [...], key_number: null },
    full_article: { headline: "...", hook: "...", in_20_seconds: "...", what_happened: "...", why_this_matters: "...", bigger_picture: "...", key_stats: [], explore_sections: [...], takeaways: [...] },
    audioUrl: "https://fuvquwhphuheqgfdmtbh.supabase.co/storage/v1/object/public/article-audio/articles/<id>/hi.wav",
    translationStatus: "ready", // 'pending' | 'processing' | 'ready' | 'failed'
    audioStatus: "ready"        // 'pending' | 'processing' | 'ready' | 'failed'
  },
  te: { ... }
}
```

### Desktop Integration Rules
- **Rule LOC-01**: The Desktop client MUST consume existing translated content from `languages[lang]` if `translationStatus === 'ready'`.
- **Rule LOC-02**: If the selected language is not ready, the client MUST fall back cleanly to English (`en`).
- **Rule LOC-03**: The Desktop client MUST NEVER initiate duplicate translations or call Sarvam APIs directly.

---

## 8. Audio / TTS

### Source Evidence
- `Cie-Daily-Studio/src/lib/localization.ts` (lines 245–395)
- `app/lib/core/services/audio_controller.dart`

### Generation Pipeline
1. **Engine**: Sarvam AI model `bulbul:v3`.
2. **Script Composition**: `quick_brief.headline` + `quick_brief.quick_summary` + `"What happened."` + `full_article.what_happened` + `"Why this matters."` + `full_article.why_this_matters` + explore section titles and content.
3. **Chunking**: Chunks of up to 2300 characters combined into a valid single PCM WAV file.
4. **Hosting**: Supabase Storage `article-audio` bucket.

### Desktop Integration Rules
- **Rule AUD-01**: Desktop audio players MUST directly stream the pre-generated `audioUrl` from `languages[lang].audioUrl`.
- **Rule AUD-02**: Desktop clients MUST NOT generate synthesized audio locally or invoke external TTS services.

---

## 9. Saved Content (Library)

### Source Evidence
- `app/lib/features/feed/data/firebase_feed_repository.dart`
- `app/lib/features/lists/data/article_list_repository.dart`
- `firestore.rules` (lines 57, 176)

### Existing Mechanisms
1. **Primary Bookmarks (Fast In-Document Array)**:
   - Field: `posts/{postId}.bookmarkedBy` (array of Firebase UIDs).
   - Query: `posts.where('bookmarkedBy', arrayContains: user.uid).where('status', isEqualTo: 'approved')`.
   - Toggle: `FieldValue.arrayUnion([userId])` / `FieldValue.arrayRemove([userId])`.
2. **Curated User Lists**:
   - Collection: `articleLists/{listId}`
   - Schema: `{ ownerUid, ownerName, title, description, articleIds: string[], isPublic, createdAt, updatedAt }`.

### Desktop Integration Rules
- **Rule LIB-01**: The Desktop Library MUST query `posts.where('bookmarkedBy', arrayContains: user.uid)` to display saved stories.
- **Rule LIB-02**: Bookmark toggles on desktop MUST use Firestore `arrayUnion`/`arrayRemove` on `posts/{postId}.bookmarkedBy` to ensure instant cross-platform sync with mobile.

---

## 10. Following & User Preferences

### Source Evidence
- `app/lib/features/user/data/firebase_user_repository.dart` (lines 188–248)
- `firestore.rules` (lines 89–92)

### Existing Storage
1. **Follow Collection**: `follows/{followerUid}_{targetUid}` with `{ followerId: string, targetUserId: string, createdAt: Timestamp }`.
2. **Profile Sync**: Updates `users/{callerUid}.following` / `followingCount` and `users/{targetUid}.followers` / `followersCount`.

---

## 11. Notifications

### Source Evidence
- `supabase/functions/_shared/notifications.ts`
- `firestore.rules` (lines 158–165)

### Structure & Dispatch
1. **Token Registration**: `users/{userId}/fcmTokens/{tokenId}` with `{ token, uid, platform: 'android'|'web'|'desktop', updatedAt }`.
2. **Backend Dispatch**: `deliverToUser()` writes to `notifications/{notificationId}` and executes FCM multicast with channel `cie_daily_messages` (`#FF5A1F`, priority: `high`).
3. **Stale Token Pruning**: Automatically deletes invalid tokens on FCM registration error codes.

---

## 12. AI & Knowledge (MEDHA)

### Source Evidence
- `supabase/functions/medha-chat/index.ts`
- `app/lib/features/medha/services/medha_assistant_service.dart`

### System Characteristics
1. **Endpoint**: Supabase Edge Function `medha-chat`.
2. **Scope Gate**: Groq model `openai/gpt-oss-20b` filters out-of-scope queries (e.g. dating, cooking, random trivia).
3. **RAG Context**: Dynamically injects story chunks and related category articles from Firestore.
4. **Companions**: 5 distinct personas (`kiro`, `lumi`, `momo`, `zuzu`, `nishi`).

### Desktop Integration Rules
- **Rule AI-01**: The Desktop client MUST communicate with AI exclusively via the `medha-chat` Edge Function.
- **Rule AI-02**: NO LLM provider keys (OpenAI, Gemini, Groq, NVIDIA) may ever be embedded in desktop client code.

---

## 14. Shared Reading State

### Source Evidence
- `src/services/readingStateService.ts`
- `app/lib/features/reading_state/data/firebase_reading_state_repository.dart`
- `firestore.rules` (users/{userId}/readingState/{articleId})

### Canonical Cloud Model
```
users/{userId}/readingState/{articleId}
```

### Schema & Milestones
```typescript
interface PlatformReadingStateRecord {
  articleId: string;
  firstOpenedAt: Timestamp;
  lastOpenedAt: Timestamp;
  progress: number; // 0.0 to 1.0
  lastCompletedAt?: Timestamp | null;
  preferredLanguage?: 'en' | 'hi' | 'te';
  lastAudioPositionSeconds?: number;
  audioDurationSeconds?: number;
  lastInteractionMode: 'reading' | 'audio' | 'brief';
  updatedAt: Timestamp;
}
```

### Security & Privacy Rules
- **Rule RS-01 (Owner-Only Access)**: Private subcollection accessible strictly by `request.auth.uid == userId`.
- **Rule RS-02 (Throttling & Debouncing)**: Desktop and mobile clients batch progress writes, persisting to cloud only on 10% milestone deltas (25%, 50%, 75%, 90%+) or 2.5s inactivity debounce.
- **Rule RS-03 (Completion Threshold)**: Completion (`lastCompletedAt`) is established when `progress >= 0.90` after meaningful reading interaction.
- **Rule RS-04 (Zero Invasive Telemetry)**: No raw scroll coordinates, mouse telemetry, or continuous surveillance tracking is ever recorded.

---

## 15. Canonical Story Identity & Clustering

### Source Evidence
- `src/services/storyMatchingService.ts`
- `src/services/storyThreadService.ts`
- `src/services/entityExtractionService.ts`
- `app/lib/features/story_threads/models/story_thread_model.dart`
- `firestore.rules` (`match /stories/{storyId}`)

### Canonical Data Model
1. **Stories Collection**: `stories/{storyId}`
   - `id`: Canonical Story Identifier (`st_<timestamp_ms>_<random_hex>`).
   - `title`: Canonical evolving story headline/title.
   - `summary`: High-level synthesis of the story development across updates.
   - `primaryCategory`: Primary category (e.g. `'Article'`, `'Technology'`, `'AI & ML'`).
   - `tags`: Array of thematic tags.
   - `entityIds`: Normalized canonical entity identifiers (`['ent_ather_energy', 'ent_konarc']`).
   - `status`: `'developing' | 'active' | 'resolved' | 'archived'`.
   - `articleCount`: Total count of published articles attached to this thread.
   - `articleIds`: Array of Firestore `posts/{postId}` IDs in chronological order.
   - `leadArticleId`: Anchor article ID.
   - `firstArticlePublishedAt` / `lastArticlePublishedAt`: Timestamps of first and latest articles.
   - `createdAt` / `updatedAt`: Server timestamps.

2. **Article Extension**: `posts/{postId}.storyId`
   - Non-breaking optional string reference linking a post to its parent `stories/{storyId}`.

### Desktop Integration Rules
- **Rule STORY-01 (Single Source of Truth)**: A `story` represents the evolving real-world development (`stories/{storyId}`); a `post` represents a single published update (`posts/{postId}`). Individual posts MUST NOT lose their unique Firestore document IDs.
- **Rule STORY-02 (Zero Breaking Changes to Posts)**: Reading from `posts` remains fully functional without requiring `storyId`. Clients gracefully handle articles where `storyId` is `undefined`.
- **Rule STORY-03 (High-Precision Clustering Policy)**: Story matching enforces a strict confidence policy ($\ge 0.75$ for auto-attach; $0.60 - 0.74$ for review/split; $< 0.60$ for new story seed). Entity-only matches without lexical or event alignment are suppressed to $\le 0.45$ to achieve a **0.0% false merge rate**.
- **Rule STORY-04 (Security & Access Control)**: `stories/{storyId}` is publicly readable by all clients (`allow read: if true;`) and writable strictly by authenticated creators and staff admins.
- **Rule STORY-05 (Cross-Device Consistency)**: Both Mobile (Flutter) and Desktop (React) map and resolve story threads identically using the canonical Firestore transport schema.

---

## 16. Story Timeline & Structured Updates

### Source Evidence
- `src/services/timelineExtractionService.ts`
- `src/services/structuredFactService.ts`
- `src/services/storyDeltaEngine.ts`
- `src/services/storyTimelineService.ts`
- `app/lib/features/story_threads/models/story_timeline_event_model.dart`
- `app/lib/features/story_threads/models/story_update_model.dart`
- `app/lib/features/story_threads/data/story_timeline_repository.dart`
- `firestore.rules` (`match /stories/{storyId}/timeline/{timelineEventId}`, `match /stories/{storyId}/updates/{updateId}`)

### Canonical Cloud Models
1. **Story Timeline**: `stories/{storyId}/timeline/{timelineEventId}`
   - `id`: Deterministic Event ID (`ev_<storyIdSuffix>_<articleIdSuffix>`).
   - `storyId`: Parent story thread ID.
   - `occurredAt`: Resolved event timestamp.
   - `datePrecision`: `'exact_day' | 'month' | 'publication_fallback' | 'range' | 'undated_fallback'`.
   - `title`: Event headline (max 120 chars).
   - `summary`: Concise factual event summary.
   - `sourceArticleIds`: Corroborating post IDs (`string[]`).
   - `sourceUrls`: Direct external source links.
   - `type`: `'launch' | 'financial' | 'regulatory' | 'announcement' | 'development' | 'correction' | 'update' | 'other'`.
   - `importance`: Integer 1–5.
   - `supersedesEventId` / `correctedByEventId`: Event IDs for correction linking.

2. **Story Updates & Deltas**: `stories/{storyId}/updates/{updateId}`
   - `id`: Canonical Update ID.
   - `storyId`: Parent story thread ID.
   - `sourceArticleId`: Incoming post ID.
   - `emittedAt`: Delta extraction timestamp.
   - `summary`: High-level summary of what shifted.
   - `changes`: Itemized `PlatformStoryChange[]` with `{ type, subject, description, previousValue, newValue, sourceArticleId }`.

### "Since You Last Read" Pipeline
- Query user's latest `lastReadAt` from `users/{uid}/readingState/{articleId}` for articles within the story.
- Fetch updates where `emittedAt > latestUserLastReadAt`.
- Surface compact banner on desktop and mobile itemizing factual shifts without requiring the user to re-read earlier material.

---

## 17. Canonical Entities, Concepts & Knowledge Trails

### Source Evidence
- `src/services/canonicalEntityService.ts`
- `src/services/canonicalConceptService.ts`
- `src/services/knowledgeGraphService.ts`
- `src/services/knowledgeTrailService.ts`
- `src/services/contextualExplanationService.ts`
- `app/lib/features/knowledge_graph/models/` (`canonical_entity_model.dart`, `canonical_concept_model.dart`, `knowledge_edge_model.dart`, `knowledge_trail_model.dart`)
- `app/lib/features/knowledge_graph/data/knowledge_repository.dart`
- `firestore.rules` (`match /entities/{entityId}`, `match /concepts/{conceptId}`, `match /knowledgeEdges/{edgeId}`, `match /knowledgeTrails/{trailId}`)

### Canonical Knowledge Models
1. **Canonical Entities**: `entities/{entityId}`
   - Discrete named real-world actors, companies, institutions, places, or products.
   - `id`, `canonicalName`, `type`, `aliases`, `shortDescription`, `externalIds`, `createdAt`, `updatedAt`.
   - Disambiguation guards with word-boundary checks (`\b`) prevent false merges.

2. **Canonical Concepts**: `concepts/{conceptId}`
   - Abstract, teachable principles, frameworks, mechanisms, and methodologies.
   - `id`, `name`, `aliases`, `shortDefinition`, `category`, `difficulty`, `parentConceptIds`, `relatedConceptIds`.
   - Enforces concise, neutral, non-circular definitions graded into `basic`, `intermediate`, or `advanced`.

3. **Knowledge Edges / Relationships**: `knowledgeEdges/{edgeId}`
   - Evidenced, typed directional relationships linking entities and concepts.
   - `id`, `sourceId`, `sourceType`, `targetId`, `targetType`, `relation`, `evidenceSnippet`, `confidence`, `sourceArticleId`.
   - Rejects self-loops and ungrounded assertions (0.0% unsupported edge rate).

4. **Knowledge Trails**: `knowledgeTrails/{trailId}`
   - Ordered pedagogical learning pathways (3 to 6 steps) taking the reader from fundamentals to mastery.
   - `id`, `title`, `description`, `category`, `targetAudience`, `estimatedMinutes`, `steps: KnowledgeTrailStepRecord[]`.
   - Enforces zero duplicate concepts, monotonic step numbering, and non-circular progression.

5. **Article & Story Knowledge Extension**:
   - `posts/{postId}.entityIds` / `posts/{postId}.conceptIds`: Optional arrays of canonical IDs.
   - `stories/{storyId}.entityIds` / `stories/{storyId}.conceptIds`: Optional arrays of canonical IDs.

---

## 19. Personal Knowledge Model & Trail Progress

### Source Evidence
- `src/services/userKnowledgeService.ts`
- `src/services/knowledgeStateReducer.ts`
- `src/services/personalizationService.ts`
- `src/types/knowledge.ts`
- `app/lib/features/knowledge_graph/models/user_knowledge_model.dart`
- `app/lib/features/knowledge_graph/models/trail_progress_model.dart`
- `app/lib/features/knowledge_graph/data/user_knowledge_repository.dart`
- `firestore.rules` (`match /users/{userId}/knowledge/{conceptId}`, `match /users/{userId}/trailProgress/{trailId}`)

### Principles & Non-Profiling Commitment
- **Direct Interaction Grounding**: User familiarity is derived solely from direct interactions (reading primary articles, completing trail steps, opening concepts, requesting explanations, or explicit user toggles).
- **No Demographic Profiling**: Zero profiling by age, education, gender, geography, job title, IQ, or assumed expertise.
- **Strict Separation from Reading State**: `users/{uid}/readingState` records raw reading progress on articles. `users/{uid}/knowledge` records synthesized conceptual familiarity.
- **Zero Overpromotion**: Weak signals (incidental mentions, brief skimming, asking for an explanation) never mark a concept as `understood`.

### Canonical Cloud Models

1. **User Knowledge Record**: `users/{userId}/knowledge/{conceptId}`
   ```typescript
   interface PlatformUserKnowledgeRecord {
     conceptId: string;
     state: 'unseen' | 'exposed' | 'familiar' | 'understood';
     confidence: number; // 0.0 to 1.0
     exposureCount: number;
     lastExposedAt: Timestamp | null;
     explanationRequestsCount: number;
     lastExplanationRequestedAt: Timestamp | null;
     completedTrailIds: string[];
     explicitUserState?: 'know_this' | 'explain_basics' | 'reset_topic' | null;
     lastInteractedAt: Timestamp;
     updatedAt: Timestamp;
   }
   ```

2. **User Trail Progress Record**: `users/{userId}/trailProgress/{trailId}`
   ```typescript
   interface PlatformUserTrailProgressRecord {
     trailId: string;
     currentStep: number; // 1-indexed
     completedStepIds: string[];
     startedAt: Timestamp;
     completedAt: Timestamp | null;
     lastInteractedAt: Timestamp;
     updatedAt: Timestamp;
   }
   ```

### Explanation Mode Policy
The personalization engine evaluates conceptual familiarity to select the optimal explanation density:
- **`FOUNDATIONAL`**: When `state === 'unseen'` or `state === 'exposed'`, or `explicitUserState === 'explain_basics'`. Provides comprehensive first-principles definitions and context.
- **`CONCISE_REFRESHER`**: When `state === 'familiar'`. Provides a 1-sentence reminder of the mechanism.
- **`ASSUME_FAMILIARITY`**: When `state === 'understood'` or `explicitUserState === 'know_this'`. Skips redundant background explanations.

### Security & Privacy Rules
- **Rule PKM-01 (Strict User Isolation)**: `users/{userId}/knowledge/{conceptId}` and `users/{userId}/trailProgress/{trailId}` are private subcollections readable and writable strictly when `request.auth.uid == userId`.
- **Rule PKM-02 (User Reset Rights)**: Users retain total control to reset any concept state (`explicitUserState: 'reset_topic'`) or delete knowledge records at any time.

---

---

## 21. Daily Brief & Finite Discovery Protocol

### Purpose & Architecture
Phase 16F.5 establishes a trusted, calm, deterministic, and finite daily digest layer across Breakpoint Desktop and Mobile:
1. **Trusted Backend Generation**: Canonical Daily Brief documents are generated exclusively on the trusted backend (Supabase Edge Function `generate-daily-brief` with Firebase ID token verification) and persisted via Admin SDK. Clients have read-only access to `users/{userId}/briefs/{briefId}`.
2. **Finite Size & Quality Threshold**: Target of 5 to 8 essential items (~5–10 min read time) per edition (morning/evening), governed by a minimum quality threshold (0.35). If fewer items qualify, only genuine high-quality items are included (e.g. 4 items).
3. **Definitive Stopping Point**: When all items are handled ($\text{Handled} = \text{completedItemIds} \cup \text{skippedItemIds} \ge \text{itemsCount}$), the interface transitions to a tranquil **"YOU'RE CAUGHT UP"** completion state.
4. **Strict Story Deduplication**: Multiple articles in the same story thread collapse into exactly 1 brief item with stable identity (`${briefId}_${type}_${canonicalRef}`).
5. **Consumed Story Suppression**: Stories already consumed (`readingState.progress >= 0.90`) with no new material facts are 100% suppressed.
6. **Continuing Story Deltas**: Stories with material updates after the user's latest interaction timestamp highlight factual deltas ("Since You Last Read").
7. **Strict Reading State Isolation**: Daily brief item consumption modifies ONLY `users/{userId}/briefProgress/{briefId}` and does NOT write `readingState.progress = 1.0` or call `updateReadingProgress`. Full article reading state is preserved until the user explicitly opens and reads the full article.
8. **Separation of Interest & Knowledge**: Interests filter candidate selection; personal knowledge state dictates explanation depth (`primer`, `compact_delta`, `standard`, `deep_dive`).

### Canonical Schemas
1. **Daily Brief**: `users/{userId}/briefs/{briefId}` [CLIENT READ ONLY]
   ```typescript
   interface PlatformDailyBriefRecord {
     briefId: string; // e.g. '2026-09-30-morning'
     userId: string;
     edition: 'morning' | 'evening';
     date: string; // 'YYYY-MM-DD'
     createdAt: string;
     estimatedMinutes: number;
     itemsCount: number;
     items: PlatformDailyBriefItemRecord[];
     isCompleted: boolean;
   }
   ```
2. **Daily Brief Progress**: `users/{userId}/briefProgress/{briefId}` [CLIENT OWNER READ/WRITE]
   ```typescript
   interface PlatformDailyBriefProgressRecord {
     briefId: string;
     userId: string;
     activeIndex: number;
     completedItemIds: string[];
     skippedItemIds: string[];
     isCaughtUp: boolean;
     caughtUpAt?: string;
     timeSpentSeconds: number;
     lastUpdatedAt: string;
   }
   ```

---

## 22. Platform Compatibility Summary

```
   ┌─────────────────────────────────────────────────────────────┐
   │                  BREAKPOINT CORE PLATFORM                   │
   │                                                             │
   │  Firebase Auth (cie-connect)  ·  Firestore  ·  Supabase FNs  │
   └───────────────┬─────────────────┬─────────────────┬─────────┘
                   │                 │                 │
                   ▼                 ▼                 ▼
          ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
          │  Flutter App   │ │  Studio (Web)  │ │  Desktop App   │
          │  (Android/iOS) │ │ (Admin/Publish)│ │ (React/Desktop)│
          └────────────────┘ └────────────────┘ └────────────────┘
```

The Breakpoint platform operates on a single unified backend. Mobile, Studio, and Desktop experiences share identical identity, content schemas, reading state, story identities, timeline/delta engines, cumulative knowledge graphs, privacy-preserving personal knowledge models, and finite daily brief experiences.




