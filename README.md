# OrganAIzer

> **OrganAIzer** is an AI-powered personal workspace. It bundles an AI assistant,
> calendar, task automation, knowledge base, speech tools and AI model connections
> behind a single, authenticated web interface.
>
> Deployed at https://organaizer.app/

---

## Version: 0.1.12 (July 2026)

## Feature Overview

### Assistent (Hermes)
- Embedded OpenWebUI chat (Hermes is wired into OpenWebUI on the server).
- File upload into the chat; download of generated media.

### Termine (Calendar)
- Excel import/export, weekly calendar, appointment details, filtering, highlighting.

### Aufgaben (Tasks) — v0.1.3
- **YouTube Download**: URL input, format selection (MP3/MP4), yt-dlp with Deno JS runtime.
- **Bilder erstellen**: Prompt, Negativprompt, 8 Stile, 5 Seitenverhältnisse, 1-4 Bilder, 3 Qualitätsstufen. Backend: FAL.ai → Hermes API → Pollinations.ai fallback (always works, no API key needed).
- **OCR-Texterkennung**: 3 Input-Modi (Datei, URL, Zwischenablage), 5 Sprachen, Tesseract OCR. URL mode downloads image server-side.
- **Internetrecherche**: Thema → Tiefe → asynchroner Hermes-Auftrag mit Laufzeit/Status → Markdown-Zusammenfassung, herunterladbar.
- **Templates**: 4 Vorlagen (Neue Aufgabe, Wiederkehrende, Review, Workflow).
- **Cancel**: AbortController für alle Tasks.
- **Ausführungs-Historie**: Per-User SQLite task_history.

### Wissen (Knowledge)
- Obsidian vault integration: Suche, Navigation (Tree, collapsed by default), Tags, Recently edited.
- WYSIWYG Markdown-Editor (@uiw/react-md-editor) with toolbar and live preview.

### Sprache (Speech)
- TTS (Text vorlesen), STT (Sprache zu Text), Diktieren (microphone recording).
- Live-Dialog with the voice assistant through an authenticated LiveKit room.
- Browser signaling uses the TLS reverse proxy (`wss://terminlandschaft-api.ai-server.org/rtc`); the internal `ws://localhost:7880` address is never returned to remote browsers.

### Telefonie
- Incoming and outgoing SIP calls use the same LiveKit agent while remaining independent of the browser Dialog transport.
- Phonebook, call notes, transcript summaries, and telephony configuration are persisted below the protected `data/` directory.

### KI Verbindungen (AI Connections)
- 8 Providers: Ollama, llama.cpp, Amazon Bedrock, Copilot, OpenAI, Claude, Gemini, OpenRouter.
- Categories: Lokal, Eigen, Cloud. Secret-based API key management.

### Planung und System
- OpenRouter-based rule validation and scheduling with searchable model selection.
- Lange Planungen laufen als Hintergrundauftrag; Laufzeit, Verarbeitungsphase und verfügbare Zwischenschritte werden in der Oberfläche angezeigt.
- All active rules are selected by default; individual rules are available in a collapsed detail panel.
- Planning results are downloadable as import-compatible Excel workbooks before any data is replaced.
- Excel imports require explicit confirmation in both frontend and backend because they overwrite schedule data.
- The System view monitors CPU, RAM and Docker container health.

### Theme & Language
- Dark/Light mode toggle. German/English language switch.

---

## Architecture

- **Frontend**: React 18 + TypeScript + Vite, deployed on ionos (organaizer.app).
- **Backend**: Flask + Gunicorn in Docker container on AI server (port 4815).
- **Database**: Self-hosted Supabase PostgreSQL 17 with a private PostgREST endpoint and SQLite rollback copy.
- **Auth**: OpenWebUI (shared login, no separate user database).
- **API**: HTTPS reverse-proxy via nginx-proxy-manager (terminlandschaft-api.ai-server.org).
- **Voice**: LiveKit + LiveKit SIP + Redis + a shared realtime voice-agent worker for browser and telephone sessions.
- **Tests**: Playwright (84 tests, headless Chromium).

## Development

```bash
# Frontend
cd frontend && npm install && npm run dev

# Build
cd frontend && npm run build

# Deploy
bash upload_frontend.sh  # builds + uploads to ionos

# Docker
sudo docker compose build && sudo docker compose up -d

# Required for OpenRouter planning (store only in .env)
OPENROUTER_API_KEY=...

# Tests
cd frontend && npm test              # all 84 tests
cd frontend && npm run test:headed   # with browser window
cd frontend && npm run test:report   # HTML report
```

## Test Suite (84 tests, 17 files)

| # | File | Tests | Area |
|---|------|-------|------|
| 01 | landing-page | 7 | Landing page |
| 02 | login | 6 | Login flow (serial) |
| 03 | zugang-anfragen | 4 | Access request |
| 04 | theme | 4 | Dark/Light mode |
| 05 | language | 3 | DE/EN switching |
| 06 | aufgaben-recherche | 8 | Internet research |
| 07 | aufgaben-ocr | 6 | OCR text recognition |
| 08 | aufgaben-youtube | 6 | YouTube download |
| 09 | aufgaben-bilder | 10 | Image generation |
| 10 | sprache-tts | 6 | Text-to-speech |
| 11 | sprache-stt | 5 | Speech-to-text |
| 12 | sprache-diktieren | 6 | Dictation |
| 13 | ocr-url | 7 | OCR with URL input |
| 14 | theme-auth | 1 | Theme in app |
| 15 | language-auth | 1 | Language in app |
| 16 | bilder-generate | 2 | Image generation pipeline |

## Key Files

- `frontend/src/components/AufgabenView.tsx` — Tasks UI (YouTube, OCR, Recherche, Bilder)
- `frontend/src/components/BildGeneratorView.tsx` — Image generator
- `frontend/src/components/WissenView.tsx` — Knowledge base + WYSIWYG editor
- `frontend/src/components/KIVerbindungView.tsx` — AI connections (8 providers)
- `backend/api/routes.py` — All REST API endpoints
- `backend/api/ai_connections_routes.py` — AI connection CRUD
- `backend/telephony/livekit_token.py` — short-lived browser tokens and safe public WebSocket URL selection
- `voice/app/agent.py` — shared browser-dialog and telephone voice worker
- `Dockerfile` — Multi-stage: Node build + Python runtime (yt-dlp, ffmpeg, tesseract, deno)
- `docker-compose.yml` — Container config
- `playwright.config.ts` — Test configuration
- `tests/` — 17 Playwright test suites
