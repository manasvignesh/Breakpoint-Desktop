# Breakpoint Admin — Editorial & Operations Workspace

## 1. Overview
Breakpoint Admin is the editorial, publishing, generative AI pipeline, media management, and live studio interface integrated directly into the Breakpoint Desktop application. Formerly known as CIE Daily Studio, it has been fully unified under Breakpoint's desktop shell with seamless single-sign-on (SSO) authentication and role-based access control.

## 2. Architecture & Directory Structure
- **Root Admin Interface**: `src/admin/BreakpointAdmin.tsx`
- **Admin Library & Service Adapters**: `src/admin/lib/`
  - `article-contract.ts`: Content schema validation and canonical transformation
  - `article-images.ts`: Cover and media asset resolution
  - `editorial-automation.ts`: Generative AI ingest and queue processing
  - `editorial-tool.ts`: Editorial review actions and status mutations
  - `firebase.ts`: Shared Firebase client re-export
  - `firestore-safe.ts`: Resilient Firestore reading with type safety
  - `generation-budget.ts`: Cost and quota monitoring for LLM jobs
  - `github-worker-trigger.ts`: Cloud workflow triggering
  - `languages.ts`: Multilingual translation and TTS configurations (EN, HI, TE)
  - `localization.ts`: Modular translation and TTS processing
  - `types.ts`: Editorial domain and pipeline types
- **Admin Styles**: `src/admin/styles/admin.css` (scoped under `#admin-root.admin-workspace` to eliminate visual collision with Breakpoint Reader)

## 3. Key Capabilities & Routes
1. **Overview (`/admin`)**: Real-time metrics on published articles, draft queues, active LiveKit rooms, and community engagement.
2. **Articles (`/admin/articles`)**: Comprehensive article management table with multi-criteria filtering, search, quick status toggles, deletion, and "Open in Breakpoint Reader" action.
3. **Article Editor (`/admin/articles/new` & `/admin/articles/:id`)**: Full-featured structured editor supporting quick briefs, full article deep-dives, entity tags, multilingual translations, audio generation, and live reader preview.
4. **Editorial Inbox (`/admin/editorial`)**: Ingest queue for automated news feeds, raw intelligence feeds, review gates, and 1-click publishing.
5. **Reels Studio (`/admin/reels`)**: Short-form vertical video management and distribution.
6. **Media Library (`/admin/media`)**: Storage bucket browser, image/audio asset upload, and direct CDN URL generation.
7. **Live Studio & Broadcast (`/admin/live` & `/admin/live/:id`)**: LiveKit WebRTC video rooms, stream management, screen sharing, and participant controls.
8. **Audio Spaces (`/admin/spaces`)**: Real-time audio discussion rooms and speaker orchestration.
9. **Comments Moderation (`/admin/comments`)**: Community conversation moderation, reply management, and abusive comment filtering.
10. **Analytics (`/admin/analytics`)**: Reader retention graphs, top performing stories, daily active briefs, and engagement stats.
11. **User & Author Roles (`/admin/users`)**: Role assignment (Admin, Editor, Author, Moderator) and user directory.
12. **Settings (`/admin/settings`)**: Environment diagnostics, Firestore contract checks, and backend health indicators.

## 4. Cross-Workspace Navigation
- **Reader to Admin**: Authenticated Admins and Editors see an "Admin Studio" badge in the Reader sidebar and top navigation header. Clicking it navigates to `/admin`.
- **Admin to Reader**: The top navigation bar in Breakpoint Admin features a "View Breakpoint Reader" toggle button.
- **Article Deep-Linking**: From the Articles list or Article Editor, clicking "Open in Breakpoint" or "Reader View" immediately transitions to the Reader viewport at `/app?story={storyId}`.
