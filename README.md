# Breakpoint Desktop & Admin

> Modern, AI-augmented engineering intelligence platform and editorial workspace packaged as a high-performance Windows desktop application using Tauri 2 and React.

## Features

### Breakpoint Reader
- **Discover Feed**: Categorized intelligence feed with real-time updates and live synchronization.
- **Personal Knowledge Trails**: Entity and concept learning trails with cross-device progress synchronization.
- **Daily Brief**: Finite, distraction-free daily summary generated on-demand via trusted Supabase Edge Functions.
- **Personal Library**: Offline-capable bookmarking and personal reading history.
- **Multilingual Support**: Real-time localization in English, Hindi (HI), and Telugu (TE) with synchronized audio narration.

### Breakpoint Admin (Integrated Studio)
- **Editorial Ingest & Queue**: Automated news scraping, AI draft synthesis, and 1-click publishing.
- **Structured Article Editor**: Granular editor for quick briefs, timeline facts, takeaways, and audio generation.
- **Live Studio & Broadcast**: Real-time WebRTC audio/video broadcasting powered by LiveKit.
- **Interactive Audio Spaces**: Low-latency community audio rooms and speaker management.
- **Media & Asset Library**: Direct asset upload, CDN indexing, and Cloud Storage browser.
- **Community & Analytics**: Discussion moderation and real-time reader engagement analytics.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Recharts
- **Desktop Runtime**: Tauri 2 (Rust, Webview2, Windows x64)
- **Data & Auth**: Firebase Authentication, Cloud Firestore, Cloud Storage
- **Edge Backend**: Supabase Edge Functions (Deno Deploy)
- **Real-Time Streaming**: LiveKit Cloud / WebRTC

## Quick Start

### Prerequisites
- Node.js >= 18
- Rust & Cargo (for Tauri build)
- Windows 10/11 with WebView2 runtime

### Setup
```bash
# 1. Clone repository
git clone https://github.com/manasvignesh/Breakpoint-Desktop.git
cd Breakpoint-Desktop

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Firebase and Supabase credentials

# 4. Run development server
npm run dev

# 5. Run Tauri desktop app in dev mode
npm run tauri dev
```

### Building for Production
```bash
# Build web frontend and Tauri Windows executable
npm run build
npm run tauri build
```
Compiled executable will be located at:
`src-tauri/target/release/Breakpoint.exe`

## Architecture & Documentation
- [Breakpoint Admin Guide](docs/breakpoint-admin.md)
- [Studio Integration Audit](docs/studio-integration-audit.md)
- [Unified Auth & Routing](docs/auth-routing.md)
- [Daily Brief Pipeline](docs/daily-brief.md)
- [Personal Knowledge Model](docs/personal-knowledge-model.md)
- [Platform Contract](docs/platform-contract.md)

## License
Proprietary & Confidential. All rights reserved.
