# Terminlandschaft - Implementation Architecture

## Overview

Terminlandschaft is a full-stack appointment scheduling system that imports meeting data from Excel files into a relational database and provides both CLI and web-based interfaces for viewing and managing appointments.

## Technology Stack

### Backend
- **Python 3.13+**: Primary language
- **SQLite3**: Default database (via stdlib)
- **Flask**: Web framework and REST API server
- **Flask-CORS**: CORS support for development
- **openpyxl**: Excel file reading/writing
- **pytesseract**: OCR text extraction from images (v0.1.2)
- **Pillow**: Image processing for OCR (v0.1.2)
- **yt-dlp**: YouTube video/audio download (system binary, installed in Dockerfile)
- **ffmpeg**: Audio extraction for yt-dlp (system binary, installed in Dockerfile)
- **tesseract-ocr**: OCR engine with language packs DE/EN/FR/ES/IT (system binary, installed in Dockerfile)

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Plain CSS**: Styling (no framework)
- **@uiw/react-md-editor**: WYSIWYG Markdown editor with toolbar and live preview (v0.1.2)
- **lucide-react**: Icon library

## Architecture Layers

### 1. Database Abstraction Layer

**Location**: `backend/db/`

The database layer uses the Adapter pattern with an abstract base class:

- **`interface.py`**: Defines `DatabaseInterface` ABC with methods:
  - `connect()`, `disconnect()`
  - `execute()`, `executemany()`
  - `fetchall()`, `fetchone()`
  - `create_tables()`, `clear_tables()`

- **`sqlite_adapter.py`**: SQLite implementation of `DatabaseInterface`
  - Uses `sqlite3.Row` for dict-like row access
  - Enables foreign keys with `PRAGMA foreign_keys = ON`
  - Auto-creates data directory

- **`models.py`**: SQL schema definitions
  - `CREATE_TABLES`: List of CREATE TABLE statements
  - `CLEAR_ORDER`: Tables in reverse dependency order for safe deletion

**PostgreSQL Migration**: To migrate to PostgreSQL, create a new `PostgreSQLAdapter` class implementing `DatabaseInterface` using `psycopg2` or `asyncpg`. Only the adapter needs to change; services remain unchanged.

### 2. Service Layer

**Location**: `backend/services/`

- **`import_service.py`**: Excel to database import
  - Reads schedule.xlsx with openpyxl
  - Clears all tables before import (FK-safe order)
  - Imports sheets: Bereiche, Usergruppen, Intervalle, Termine, Terminliste
  - Normalizes variable-width participant columns into junction table
  - Handles missing interval codes (2M, W6)
  - Verbose logging at each step

- **`export_service.py`**: Database to Excel export
  - Reconstructs original Excel format
  - For Terminliste: JOINs with termine, intervalle, aggregates participants
  - Calculates end time from start + duration
  - Reconstructs wide participant column format for Termine sheet

### 3. API Layer

**Location**: `backend/api/`

- **`routes.py`**: Flask Blueprint with REST endpoints
  - `GET /api/weeks` - Available calendar weeks
  - `GET /api/week/<week>` - Appointments for a week with full details
  - `GET /api/termine/<nr>` - Meeting detail for double-click modal
  - `GET /api/bereiche` - Department groups
  - `GET /api/usergruppen` - User groups
  - `GET /api/intervalle` - Interval codes
  - `POST /api/import` - File upload import
  - `GET /api/export` - Excel download

### 4. Web Server

**Location**: `backend/server.py`

- Flask application with:
  - API blueprint registered at `/api`
  - Static file serving for React build at `/`
  - Import endpoint: saves uploaded file, calls import service
  - Export endpoint: calls export service, returns file download
  - Fallback to index.html for client-side routing

### 5. CLI Entry Point

**Location**: `backend/main.py`

- Command-line interface:
  - `python -m backend.main import <file>` - Import Excel to DB
  - `python -m backend.main export <file>` - Export DB to Excel
- Creates tables if they don't exist
- Sets up verbose logging

## Frontend Architecture

### Component Hierarchy

```
App
├── Header
│   ├── WeekSelector
│   └── ImportExport
├── FilterPanel
│   ├── Bereich dropdown
│   ├── Meeting dropdown
│   └── Highlight mode checkbox
├── WeeklyCalendar
│   ├── Time axis (7:00-19:00)
│   └── Day columns (Mon-Sun)
│       └── Appointment blocks
└── AppointmentDetail (modal)
    └── Meeting details with participants
```

### Component Details

- **`App.tsx`**: Root component
  - State: week, appointments, bereiche, usergruppen, filters
  - Effects: load appointments on week change, load metadata on mount
  - Filtering logic: by Bereich (via usergruppen lookup) or meeting number
  - Highlight mode: CSS class toggle instead of filtering

- **`WeeklyCalendar.tsx`**: Calendar grid
  - X-axis: Days (Mon-Sun)
  - Y-axis: Time (7:00-19:00, 2px per minute)
  - Appointment blocks positioned absolutely by start time
  - Height proportional to duration
  - Double-click handler opens detail modal

- **`WeekSelector.tsx`**: Week navigation dropdown (1-4)

- **`FilterPanel.tsx`**: Filter controls
  - Bereich dropdown: filters by department group A-F
  - Meeting dropdown: filters by meeting number
  - Highlight mode checkbox: toggle between hide and highlight

- **`AppointmentDetail.tsx`**: Modal showing full meeting details
  - Number, name, week, day, start, end, duration, interval
  - Participant list with codes, descriptions, names

- **`ImportExport.tsx`**: File upload and download buttons
  - Import: file input, POST to /api/import, reload on success
  - Export: GET /api/export, trigger browser download

### State Management

- React `useState` for all local state
- `useEffect` for data fetching
- No external state management library (Redux, etc.)

### API Client

**Location**: `frontend/src/api.ts`

- Thin wrapper around `fetch()`
- Functions: `fetchWeeks()`, `fetchWeekAppointments()`, `fetchTerminDetail()`, etc.
- Import/export: FormData upload, blob download

## Data Flow

### Import Flow

```
schedule.xlsx
    ↓ (openpyxl)
Import Service
    ↓ (DatabaseInterface)
SQLite Database
```

1. CLI or web receives Excel file
2. Import service clears tables in FK order
3. Each sheet imported into corresponding table(s)
4. Termine participants normalized into junction table
5. Terminliste stores only non-derived columns

### Export Flow

```
SQLite Database
    ↓ (JOINs + aggregation)
Export Service
    ↓ (openpyxl)
output.xlsx
```

1. Export service queries all tables
2. For Terminliste: JOINs reconstruct derived fields
3. For Termine: wide participant columns reconstructed
4. Excel file written with original sheet format

### View Flow

```
User selects week
    ↓
React fetches /api/week/<week>
    ↓
Flask queries DB with JOINs
    ↓
JSON response with full appointment details
    ↓
React renders calendar grid
```

## Database Schema

### Tables

```sql
bereiche (
    gruppe TEXT PRIMARY KEY,  -- A, B, C, D, E, F
    bereich TEXT              -- Department name
)

usergruppen (
    nummer TEXT PRIMARY KEY,  -- e.g., A1, B2, C3
    bereich TEXT REFERENCES bereiche(gruppe),
    bezeichnung TEXT,         -- Role description
    name TEXT                 -- Person name (nullable)
)

intervalle (
    kuerzel TEXT PRIMARY KEY, -- 1W, 2W, W2, etc.
    bedeutung TEXT            -- Description
)

termine (
    bespr_nr INTEGER PRIMARY KEY,
    bezeichnung TEXT,         -- Meeting name
    intervall TEXT REFERENCES intervalle(kuerzel),
    dauer_min INTEGER         -- Duration in minutes
)

termin_teilnehmer (
    bespr_nr INTEGER REFERENCES termine(bespr_nr),
    usergruppe TEXT,          -- Can be individual (D1) or group (B)
    PRIMARY KEY (bespr_nr, usergruppe)
)

terminliste (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    woche INTEGER,            -- Week 1-4
    tag TEXT,                 -- Mon, Tue, etc.
    start TEXT,               -- HH:MM
    meeting INTEGER REFERENCES termine(bespr_nr)
)
```

### Design Decisions

1. **Terminliste normalization**: Only stores `woche`, `tag`, `start`, `meeting`. End time, name, interval, duration, and participants are derived via JOINs to avoid data duplication.

2. **Participant flexibility**: `termin_teilnehmer.usergruppe` can reference individual users (D1) or entire departments (B). The UI resolves these to names via the `usergruppen` table.

3. **Interval extensibility**: The `intervalle` table allows adding new interval codes without code changes. Missing codes from Excel (2M, W6) are auto-added during import.

## Filter Implementation

### Filter by Bereich

1. User selects Bereich (A-F) from dropdown
2. Frontend filters appointments where any participant's usergruppe belongs to that Bereich
3. Lookup: `appointment.teilnehmer` → `usergruppen.nummer` → `usergruppen.bereich`

### Filter by Meeting

1. User selects meeting number from dropdown
2. Frontend filters appointments where `bespr_nr` matches

### Highlight Mode

- When enabled, non-matching appointments get CSS class `dimmed` (opacity: 0.3)
- Matching appointments get CSS class `highlighted` (yellow background)
- When disabled, non-matching appointments are hidden (filtered out)

## Security Considerations

- No authentication implemented (internal tool assumption)
- File uploads saved to temp directory, deleted after import
- SQL injection prevented by parameterized queries
- XSS prevented by React's default escaping

## Performance

- **Import**: ~1 second for 826 terminliste entries
- **Export**: ~1 second for full Excel reconstruction
- **Calendar view**: Instant (single query with JOINs)
- **Frontend build**: ~7 seconds with Vite

## UI/UX Design

### Visual Design

- **Color Palette**: Professional blue gradient (#3498db → #2980b9) for appointments, orange (#f39c12) for highlighted items
- **Typography**: System font stack for native feel, clear hierarchy with 11-22px sizes
- **Spacing**: Consistent 8px grid system, 16-24px padding in containers
- **Shadows**: Subtle depth with box-shadows (0 2px 4px to 0 20px 60px)
- **Gradients**: Linear gradients on buttons and appointments for modern look

### Layout

- **Header**: Dark gradient background (#2c3e50 → #34495e) with white text, flex layout for controls
- **Filter Panel**: Horizontal layout with 24px gaps, wraps on smaller screens
- **Calendar Grid**: Min-width 1000px for readability, scrollable overflow
- **Time Axis**: 70px wide, sticky positioning for hour labels
- **Day Columns**: Equal flex distribution, min 130px each

### Interaction Design

- **Hover Effects**: Scale transform (1.02x) and enhanced shadow on appointment hover
- **Focus States**: Blue ring (#3498db) on select inputs for accessibility
- **Transitions**: 0.2s smooth transitions on all interactive elements
- **Modal**: Backdrop blur effect, click-outside-to-close behavior
- **Scrollbars**: Custom styled scrollbars matching the theme

### Responsive Design

- Mobile breakpoint at 768px
- Header stacks vertically on mobile
- Filter panel becomes vertical stack
- Select inputs expand to full width

## Future Enhancements

1. **PostgreSQL adapter**: Implement `PostgreSQLAdapter` for production
2. **Real-time updates**: WebSocket for multi-user sync
3. **Recurring meetings**: Better handling of interval logic
4. **Conflict detection**: Warn about overlapping appointments
5. **Mobile responsive**: Adapt calendar for small screens

---

## Telephony Module

### Overview

The telephony module adds SIP gateway configuration, voice assistant interaction with Hermes, and call history with full dialog logging. It operates in four modes to support progressive deployment without requiring real SIP credentials upfront.

### Architecture

```
Frontend (TelefonieView.tsx)          Backend (routes.py /telephony/*)
┌─────────────────────┐               ┌──────────────────────┐
│ Tab: Gateway Config  │──POST/GET────▶│ /telephony/config    │
│ Tab: Voice Assistant │──POST────────▶│ /telephony/voice     │
│ Tab: Call History    │──GET/POST────▶│ /telephony/calls     │
└─────────────────────┘               └──────────┬───────────┘
                                                  │
                                      ┌───────────▼──────────┐
                                      │ SQLite tables:       │
                                      │  sip_config          │
                                      │  calls               │
                                      │  call_dialog_entries  │
                                      └──────────────────────┘
```

### Operating Modes

| Mode | Description | Behavior |
|------|-------------|----------|
| `disabled` | Default | All call/voice endpoints return 409 with configuration hint |
| `demo` | Simulated | Calls are recorded but no SIP connection; voice returns canned responses |
| `webhook` | External provider | Call records created; webhook is **dispatched** to the configured provider URL via HTTP POST with call metadata |
| `sipjs` | Browser SIP.js (prepared) | Call records created; SIP.js integration is **prepared** but not active until `sip.js` is added as a project dependency |

### REST Endpoints

All endpoints require Bearer token authentication (same as existing API).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/telephony/config` | Read SIP config (secrets redacted) |
| POST | `/api/telephony/config` | Save SIP config |
| GET | `/api/telephony/calls` | List calls (newest first, max 200) |
| GET | `/api/telephony/calls/<id>` | Get call with full dialog log |
| POST | `/api/telephony/calls` | Start a new call |
| POST | `/api/telephony/calls/<id>/end` | End/hang up a call |
| POST | `/api/telephony/calls/<id>/dialog` | Add a dialog entry |
| POST | `/api/telephony/voice` | Send message to Hermes voice assistant |

### Database Tables

- **`sip_config`**: Singleton row (id=1) with mode, SIP server details, hashed password, webhook URL
- **`calls`**: Call records with direction, status, timestamps, duration
- **`call_dialog_entries`**: Per-call dialog log with role (user/assistant/system), content, timestamp, status

### Security

- SIP passwords are stored as salted, iterated PBKDF2-HMAC-SHA256 hashes (260,000 iterations, random 16-byte salt), never returned in API responses
- **Important**: The PBKDF2 hash is intentionally not reversible. It cannot be used for SIP REGISTER authentication. Real provider deployments require a dedicated secret-management system or provider-specific adapter (e.g. HashiCorp Vault, AWS Secrets Manager).
- All endpoints protected by the existing `enforce_auth()` middleware
- No credentials, passwords, or webhook URLs appear in log output or API call responses
- `sip_password_hash` field is stripped from all GET responses via `_sanitize_sip_row()`
- Webhook dispatch errors are recorded as redacted system dialog entries (no URLs or credentials exposed)
- This module does **not** provide full PSTN media integration; real-time voice media requires a dedicated SIP media gateway and speech-to-text pipeline

### Configuration

Add to `.env` or environment:
- No additional env vars required; telephony config is stored in SQLite
- Hermes API URL (for voice forwarding) is configured via the existing `hermes_api_url` config key

### Provider Integration Steps

To connect a real SIP provider:

1. Set mode to `webhook` or `sipjs` in the Gateway Config tab
2. For **webhook mode**: Configure your PBX/CPaaS webhook URL; the backend dispatches an HTTP POST with `remote_number`, `direction`, and `call_id` to the provider; implement the webhook receiver on the PBX side to call back into `/api/telephony/calls/<id>/dialog` with transcribed speech
3. For **SIP.js mode** (prepared, not yet active): Enter SIP server, port, username, password; install `sip.js` npm package as a project dependency; implement `UserAgent` initialization in TelefonieView using the config from `/api/telephony/config`
4. For real-time voice: Integrate a speech-to-text service (e.g., Whisper API) for transcription and forward text to `/api/telephony/voice`

### Frontend

- **Navigation**: "Telefonie" entry with Phone icon in the left sidebar
- **Three tabs**: Gateway (SIP config form), Voice Assistant (chat-style interface), Call History (list + detail with dialog log)
- **Responsive**: Call history layout collapses to single column on mobile
- **i18n**: Full German and English translations under `telefonie.*` keys

## Resource Management Module

### Data Model & Table Mapping

Existing tables provide base data that is reused without destructive migration:

| Existing Table | Purpose | New Usage |
|---|---|---|
| `bereiche` | Department groups (PK: gruppe) | Exposed as "Gruppen" in Resources (read-only) |
| `usergruppen` | Persons/positions (PK: nummer) | Group members; linked via `personen.usergruppe` FK |
| `termine` | Meeting definitions (PK: bespr_nr) | Listed in Resources/Termine tab (read-only CRUD) |
| `terminliste` | Scheduled instances | Unchanged; planning may add rows transactionally |
| `intervalle` | Recurrence codes | Unchanged reference data |

New normalized tables (non-destructive additions):

| Table | Purpose | Key Fields |
|---|---|---|
| `personen` | Extended personal data | id, vorname, nachname, email, telefon, usergruppe FK |
| `rollen` | Role definitions | id, bezeichnung, beschreibung, farbe |
| `person_rollen` | M:N person-role mapping | person_id FK, rolle_id FK |
| `raeume` | Room inventory | id, bezeichnung, gebaeude, kapazitaet, ausstattung |
| `komponenten` | Equipment/components | id, bezeichnung, typ, beschreibung, verfuegbar |
| `planungsregeln` | Scheduling rules | id, bezeichnung, typ, bedingung, prioritaet |
| `planungsauftraege` | Planning jobs | id, woche_von, woche_bis, status, ergebnis_json |
| `planungsauftrag_regeln` | Job-rule M:N | auftrag_id FK, regel_id FK |
| `planungsregel_abhaengigkeiten` | Rule dependencies | id, regel_id FK, typ, ziel_typ, ziel_id, ziel_text, bedingung, aktiv |

### API Contracts

All endpoints require Bearer token auth (HTTP 401 if `AUTH_ENABLED=true`).

#### Resources (`/api/resources/*`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/resources/personen[?q=]` | List/search persons |
| GET | `/api/resources/personen/:id` | Person detail with roles |
| POST | `/api/resources/personen` | Create person (requires vorname, nachname) |
| PUT | `/api/resources/personen/:id` | Update person |
| DELETE | `/api/resources/personen/:id` | Delete person |
| GET | `/api/resources/rollen` | List roles |
| POST | `/api/resources/rollen` | Create role (requires bezeichnung) |
| PUT | `/api/resources/rollen/:id` | Update role |
| DELETE | `/api/resources/rollen/:id` | Delete role |
| GET | `/api/resources/raeume[?q=]` | List/search rooms |
| POST | `/api/resources/raeume` | Create room (requires bezeichnung) |
| PUT | `/api/resources/raeume/:id` | Update room |
| DELETE | `/api/resources/raeume/:id` | Delete room |
| GET | `/api/resources/komponenten[?q=]` | List/search components |
| POST | `/api/resources/komponenten` | Create component (requires bezeichnung) |
| PUT | `/api/resources/komponenten/:id` | Update component |
| DELETE | `/api/resources/komponenten/:id` | Delete component |
| GET | `/api/resources/gruppen` | List bereiche with usergruppen members (read-only) |
| GET | `/api/resources/termine` | List meeting definitions (read-only) |

#### Planning (`/api/planning/*`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/planning/regeln` | List planning rules |
| POST | `/api/planning/regeln` | Create rule (requires bezeichnung, bedingung; typ in constraint/preference/exclusion/requirement) |
| PUT | `/api/planning/regeln/:id` | Update rule |
| DELETE | `/api/planning/regeln/:id` | Delete rule |
| GET | `/api/planning/auftraege` | List planning jobs |
| GET | `/api/planning/auftraege/:id` | Job detail with rules and parsed result |
| POST | `/api/planning/auftraege` | Create job (woche_von, woche_bis, regel_ids[], run_ai?) |
| POST | `/api/planning/auftraege/:id/run` | Run AI planning for existing draft |
| POST | `/api/planning/auftraege/:id/apply` | Apply proposals (requires `{"confirm": true}`, only for status=vorschlag) |
| GET | `/api/planning/abhaengigkeiten[?regel_id=]` | List dependencies (optional filter by rule) |
| POST | `/api/planning/abhaengigkeiten` | Create dependency (regel_id, typ, ziel_typ, ziel_id/ziel_text) |
| PUT | `/api/planning/abhaengigkeiten/:id` | Update dependency |
| DELETE | `/api/planning/abhaengigkeiten/:id` | Delete dependency |

### AI Provider Abstraction

The planning module uses a provider abstraction:
1. Checks `hermes_api_url` in config
2. If not configured: returns `fehler_provider` status with honest error message
3. If configured: sends structured prompt to `{hermes_api_url}/api/v1/execute`
4. If unreachable: returns `fehler_provider` with connection error details
5. If successful: parses response into `vorschlag` status with proposals/conflicts

No fake bookings or silent schedule changes occur. Apply requires explicit confirmation.

### Security Boundaries

- All resource/planning endpoints enforce the same auth as existing `/api` routes
- No secrets/passwords in responses or logs
- Planning proposals are stored as JSON in `ergebnis_json`, never auto-applied
- Parameterized SQL queries throughout; no string interpolation

### Frontend

- **Navigation**: "Ressourcen" (Users icon) and "Planung" (ClipboardList icon) in sidebar
- **Resources UI**: 6 tabs (Personen, Gruppen, Rollen, Räume, Komponenten, Termine) with CRUD forms, search, delete confirmation, loading/error/empty states
- **Planning UI**: 3 tabs (Regeln, Planen, Aufträge) with rule CRUD, planning wizard (week range, rule selection, AI run), result display with provider status
- **i18n**: Full DE/EN translations under `res.*` and `plan.*` keys

---

## Media & Tools Integration (v0.2)

### YouTube Download (moved from Sprache to Aufgaben)

YouTube download is now a tool card in the **Aufgaben** (Tasks) view instead of a tab in Sprache.

**Backend**: `POST /api/youtube/download`
- Auth: Required (Bearer token)
- Input: `{ url: string, format: "audio"|"video" }`
- URL validation: Strict regex allowlist for `youtube.com` and `youtu.be` domains (SSRF protection)
- Requires `yt-dlp` binary in the container
- Per-user file isolation via SHA-256 hash of user email
- File size limits: 200 MB (audio), 500 MB (video)
- Returns `{ download_url, filename }` or `{ error }` with 4xx/5xx

**File serving**: `GET /api/youtube/file/<user_hash>/<filename>`
- Auth: Required; verifies requesting user matches `user_hash`
- Safe filename sanitization to prevent path traversal

### OCR (Text Recognition)

OCR is a tool card in the **Aufgaben** view.

**Backend**: `POST /api/ocr/extract`
- Auth: Required
- Input: multipart form with `image` file + optional `language` field (default: `de`)
- Allowed types: PNG, JPEG, TIFF, BMP, WebP
- Max file size: 20 MB
- Tries `pytesseract` locally first, falls back to Hermes API (`/api/v1/ocr/extract`)
- Returns `{ text, engine }` or `{ error, config_required }`

**Configuration**: If neither `pytesseract` nor `hermes_api_url` is available, returns 409 with a clear error message.

### TTS (Text-to-Speech)

**Backend**: `POST /api/tts/generate`
- Auth: Required
- Input: `{ text, voice, speed }`
- Max text length: 10,000 characters
- Forwards to Hermes API (`/api/v1/tts/generate`)
- Returns `{ audio_url }` or `{ error, config_required }`

### STT (Speech-to-Text)

**Backend**: `POST /api/stt/transcribe`
- Auth: Required
- Input: multipart form with `audio` file + optional `language` field
- Allowed types: WAV, MP3, OGG, WebM, FLAC, MP4
- Max file size: 50 MB
- Forwards to Hermes API (`/api/v1/stt/transcribe`)
- Returns `{ text }` or `{ error, config_required }`

### Dictation (Browser Microphone)

Dictation is a tab in the **Sprache** (Speech) view.

- Uses `MediaRecorder` API for browser-based microphone recording
- Supports start/stop with clear status indicators (requesting, recording, stopping, transcribing, error)
- Handles permission denied, no microphone, and recording errors with German/English messages
- Sends recorded audio blob to `POST /api/stt/transcribe` via `apiFetch`
- Result is copyable and can be sent to TTS or saved for use in Tasks

### Hermes Execute

**Backend**: `POST /api/hermes/execute`
- Auth: Required
- Input: `{ prompt: string }`
- Max prompt length: 50,000 characters
- Forwards to Hermes API (`/api/v1/execute`)
- Returns response from Hermes or `{ error, config_required }`

### Configuration Dependencies

| Feature | Requires | Config Key |
|---------|----------|------------|
| TTS | Hermes API | `hermes_api_url` |
| STT | Hermes API | `hermes_api_url` |
| OCR | pytesseract OR Hermes API | `hermes_api_url` |
| YouTube | `yt-dlp` binary | Container package |
| Execute | Hermes API | `hermes_api_url` |

### Operational Limits

- TTS text: max 10,000 chars
- STT audio: max 50 MB
- OCR image: max 20 MB
- YouTube audio: max 200 MB, video: max 500 MB
- YouTube download timeout: 5 minutes
- Hermes API timeout: 30-60 seconds
- All endpoints require valid Bearer token (401 if missing/expired)

## KI-Verbindungen / AI Connections

The left navigation contains a dedicated `KI Verbindung` / `AI Connections` view directly above the sidebar footer. It manages redacted connection metadata for these allowlisted providers:

- Local: `ollama`, `llama_cpp`
- Own/enterprise: `bedrock`
- Cloud: `copilot`, `claude`, `gemini`, `openrouter`

### Bento UI (current)

The view uses an OpenWebUI-inspired Bento-Box layout:

- **Hero section** with title, description and primary "Add Connection" button.
- **KPI tiles** showing total connections, active connections, and configured secrets.
- **Filter chips** (All / Local / Own / Cloud) with live counts; acts as tab-style filter.
- **Responsive Bento grid** with connection cards showing provider monogram, name, category, model, endpoint info, active/inactive badge, secret status (icon + text), and inline test results.
- **Card actions**: Test (Zap icon), Edit, Delete with confirmation.
- **Modal form** for add/edit with Escape-close, inline validation, grouped provider-dependent fields, and secret-ref hint explaining env-variable-only storage.
- **Accessibility**: aria-labels on icon-only buttons, role="dialog" on modal, role="tablist" on filters, prefers-reduced-motion respected.
- **Responsive**: single-column below 768px, full-width modal on mobile.
- **i18n**: all visible text in DE/EN via existing translation system.

### API

Connections are stored idempotently in SQLite table `ki_verbindungen`. The authenticated API is registered at `/api/ai-connections` and provides list, create, update, delete, and explicit test operations. Responses never expose `secret_ref`; they expose only `secret_configured`. Secret references must be environment-variable names and no secret value is returned to the UI or logs.

The connection test is deliberately honest: Ollama/llama.cpp health checks are restricted to localhost/private addresses, while Bedrock and cloud providers return an explicit unsupported status when no provider SDK/API-specific test is available. No fake cloud success and no arbitrary SSRF request are performed. Hermes consumption of these provider-neutral records remains a preparation boundary; existing resources and planning do not automatically use a connection until that integration is implemented.

### Verification

- `cd frontend && npm run build` — must pass with zero errors.
- `python3 -m compileall -q backend` — must pass.
- `git diff --check` — no trailing whitespace.
- No backend API changes were required for the Bento UI; the existing API contract suffices.

## Public Landing Page

### Entry Flow

Unauthenticated visitors see a public product landing page (`LandingPage.tsx`) instead of a bare login form. The state is managed in `App.tsx` via a `publicView` state variable (`'landing' | 'login'`).

- **LandingPage** → shows hero, product preview, feature bento grid, workflow steps, principles, and CTAs.
- **Login CTA** → switches to `LoginScreen` with a "Back to overview" button for returning.
- **Interest/Register CTA** → opens an `InterestModal` (`<dialog>`) explaining that self-registration is disabled and advising to contact the administrator. No form data is submitted to any API.
- **Authenticated users** bypass the landing page entirely and go directly to the app shell.

### Components

| Component | File | Purpose |
|---|---|---|
| `LandingPage` | `components/LandingPage.tsx` | Full public page with all sections |
| `ProductPreview` | `components/ProductPreview.tsx` | Miniaturized app shell mock using real module names/icons |
| `InterestModal` | `components/InterestModal.tsx` | Accessible `<dialog>` modal for access request info |

### i18n

All landing page strings are in `i18n.ts` under keys prefixed with `landing.*`, supporting both DE and EN.

### CSS

Landing page styles are appended to `styles/app.css`. They use existing design tokens, support dark/light themes, include staggered fade-up animations (respecting `prefers-reduced-motion`), and are responsive down to 320px.

### Backend

No backend changes were required. The landing page is purely frontend. Auth flow remains unchanged (`POST /api/auth/login`).

## Obsidian-Wissensdatenbank

Der Host-Mount `/home/hermes/obsidian:/app/obsidian` stellt die Benutzer-Vaults bereit; `OBSIDIAN_ROOT=/app/obsidian` ist konfigurierbar. Die geschützte API liegt unter `/api/obsidian` und leitet den Vault ausschließlich aus der authentifizierten `g.user.email` ab. Clientseitige Benutzer-IDs oder Pfade werden nicht zur Identitätsbestimmung akzeptiert.

Implementierte Endpunkte sind `tree`, `search` (`fulltext`/`headings`), `tags`, `recent` (`modified`/`created`), sowie `note` zum Lesen und atomaren Schreiben. Jede Pfadauflösung prüft Kanonisierung, Vault-Containment, `.md`-Endung und Symlink-Ausbrüche; Schreibzugriffe unterstützen optimistische mtime-Konflikterkennung. Der API-Vertrag liefert ausschließlich relative Vault-Pfade.

Die Wissen-Oberfläche bietet Suche, Navigation mit Tree und Markdown-Editor, Tag-Filter und eine nach Änderungs-/Erstellungsdatum sortierbare Liste. Die Sicherheits- und Regressionstests liegen in `tests/test_obsidian_routes.py`; sie decken Traversal, Symlinks, Cross-User-Isolation, Auth-401, Suche, Tags, Tree, Lesen/Schreiben und mtime-Konflikte ab.

## Verbindungen (Integration Connections)

### Zweck

Die neue Navigationsansicht **Verbindungen** (`CategoryKey: 'verbindungen'`) ist eine vorbereitete Integrationsverwaltung. Sie ermöglicht das Auswählen von Templates für externe Dienste und das Verwalten der Metadaten hinzugefügter Verbindungen. Die eigentliche OAuth-/API-/Provider-Implementierung erfolgt zu einem späteren Zeitpunkt.

### Datenmodell

Neue idempotente SQLite-Tabelle `verbindungen` (in `backend/db/models.py`):

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `template_key` | TEXT NOT NULL | Einer der 16 definierten Template-Keys |
| `name` | TEXT NOT NULL | Benutzerdefinierter Anzeigename (max. 200 Zeichen) |
| `status` | TEXT NOT NULL DEFAULT 'prepared' | Immer `prepared` – keine behauptete Erreichbarkeit |
| `beschreibung` | TEXT | Optionale Freitext-Beschreibung |
| `erstellt_am` | TEXT NOT NULL DEFAULT (datetime('now')) | |
| `aktualisiert_am` | TEXT NOT NULL DEFAULT (datetime('now')) | |

**Keine Secret-Felder.** Tokens, Passwörter oder API-Schlüssel werden nicht gespeichert.

### Template-Allowlist

16 fest definierte Template-Keys in `VALID_TEMPLATE_KEYS` (Blueprint `verbindungen_routes.py`):

`office`, `outlook_kalender`, `outlook_mail`, `outlook_kontakte`, `outlook_aufgaben`, `google_kalender`, `onenote`, `sharepoint`, `google_mail`, `google_kontakte`, `google_aufgaben`, `onedrive`, `jira`, `confluence`, `n8n`, `mcp`

Unbekannte Template-Keys werden mit HTTP 400 abgelehnt.

### API

Blueprint: `backend/api/verbindungen_routes.py`, registriert unter `/api/verbindungen`.

Alle Endpunkte erfordern Authentifizierung (`@verbindungen_bp.before_request` → `auth.enforce_auth()`). Unauthentifizierte Anfragen erhalten HTTP 401.

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/verbindungen` | Liste aller hinzugefügten Verbindungen |
| POST | `/api/verbindungen` | Neue Verbindung anlegen (Body: `template_key`, `name`, optional `beschreibung`) |
| DELETE | `/api/verbindungen/<id>` | Verbindung löschen |

Fehlerantworten sind konsistentes JSON `{"error": "..."}`. Interne Pfade und Secrets werden nie ausgegeben.

### Frontend

- **Komponente:** `frontend/src/components/VerbindungenView.tsx`
- **Sidebar:** `CategoryKey 'verbindungen'` mit Lucide-Icon `Plug`, i18n-Label `Verbindungen`/`Connections`
- **Routing:** `App.tsx` rendert `<VerbindungenView />` für `category === 'verbindungen'`
- **API-Calls:** Ausschließlich über `apiFetch` (kein direktes `fetch`)
- **Template-Grid:** Responsives Bento-Grid, einige Karten (`office`, `n8n`) visuell breiter
- **Add-Dialog:** Bestätigung/Bearbeitung des Verbindungsnamens, klarer Hinweis auf Status `Vorbereitet`
- **Verbindungsliste:** Bento-Karten mit Icon, Name, Template, Datum, Status-Badge und Löschen-Aktion
- **n8n Split-Panel (v0.1.5):** Klick auf "Editor"-Button einer n8n-Verbindung öffnet rechts ein Detail-Panel mit Tabs: Editor (iframe), Workflows (Liste), Einstellungen (Config-Formular mit Verbindungstest)
- **Loading/Error/Empty:** Vollständige State-Behandlung
- **Barrierefreiheit:** `aria-label` für Icon-only-Aktionen, `role="dialog"`, `aria-modal`, Escape-Taste schließt Dialog, sichtbare Fokuszustände

### Sicherheitsgrenzen

- Keine OAuth-Flows, keine echten Provider-Verbindungen
- Keine Secrets, Tokens oder Passwörter werden gespeichert oder ausgegeben
- Status ist immer `Vorbereitet`/`prepared` – keine behauptete Erreichbarkeit
- SQL ist vollständig parametrisiert
- Allowlist verhindert das Anlegen unbekannter Template-Keys
- Auth wird auf Blueprint-Ebene erzwungen

### i18n

Alle Strings unter dem Präfix `vb.*` in `frontend/src/i18n.ts`, DE und EN vollständig.

---

## Zugang-anfragen (Access Request Feature)

Implementiert in: 2025-07 (Auftrag opencode-zugang-und-layout.md)

### Übersicht

Die Funktion „Zugang anfragen" auf der Landingpage ersetzt den bisherigen Platzhalter-Dialog durch ein echtes, validiertes Formular. Anfragen werden sicher im Backend gespeichert. **Kein automatischer Zugang wird gewährt.**

### Datenmodell

Neue idempotente SQLite-Tabelle `zugangsanfragen` (in `backend/db/models.py`):

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `email` | TEXT NOT NULL | Normalisiert (lowercase, getrimmt), syntaktisch geprüft |
| `zusatzinfos` | TEXT NOT NULL DEFAULT '' | Verwendungszweck, max. 500 Zeichen |
| `status` | TEXT NOT NULL DEFAULT 'open' | `open` = unbearbeitet |
| `erstellt_am` | TEXT NOT NULL DEFAULT (datetime('now')) | |
| `aktualisiert_am` | TEXT NOT NULL DEFAULT (datetime('now')) | |

**Keine IP-Speicherung, keine Secret-/Token-/Passwort-Felder.**

### API-Vertrag

Blueprint: `backend/api/access_requests_routes.py`, registriert unter `/api/access-requests`.

**Öffentlich – keine Authentifizierung erforderlich.** Bewusste Entscheidung: Das Blueprint hat kein `before_request`-Auth-Guard.

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/access-requests` | Neue Anfrage einreichen |

**Request-Body (JSON):**
```json
{ "email": "user@example.com", "zusatzinfos": "Kurze Beschreibung ..." }
```

**Erfolgreiche Antwort (HTTP 200):**
```json
{ "request_id": 42, "status": "open" }
```

**Fehlerantworten (JSON):** `{"error": "..."}` – HTTP 400 (Validierung), 429 (Rate-Limit).

**Duplikat-Verhalten:** Existiert bereits eine offene Anfrage für dieselbe E-Mail, wird die bestehende `request_id` neutral bestätigt (keine doppelte Speicherung, kein Fehler).

### Spam-Schutz / Rate-Limiting

- Einfaches In-Memory-Sliding-Window-Limit: max. 5 Anfragen pro IP pro 60 Sekunden.
- Keine dauerhafte IP-Speicherung.
- Bei Überschreitung: HTTP 429 mit JSON-Fehler.

### Serverseitige Validierung

- E-Mail: Pflichtfeld, Regex-Prüfung, max. 200 Zeichen, normalisiert zu lowercase.
- Zusatzinfos: Pflichtfeld, max. 500 Zeichen.
- Keine HTML-Ausgabe, vollständig parametrisiertes SQL.

### Frontend

- **Komponente:** `frontend/src/components/InterestModal.tsx` (ersetzt den Platzhalter)
- **API-Funktion:** `submitAccessRequest()` in `frontend/src/api.ts` – direktes `fetch` ohne Auth-Header (bewusst, da öffentliche Route)
- **Formular-Felder:** E-Mail (Pflicht), Zusatzinformationen (Pflicht, max. 500 Zeichen)
- **Zustände:** Loading, Fehler (Validierung + Server), Erfolg
- **i18n:** Alle Strings unter `interest.*` und bestehende `landing.interest.*` in `frontend/src/i18n.ts`, DE und EN
- **Barrierefreiheit:** `aria-invalid`, `aria-describedby`, `role="alert"`, `aria-live`, Escape schließt Dialog

### Datenschutz

- Gespeichert: E-Mail, Zusatzinfos, Zeitstempel, Status
- Nicht gespeichert: IP-Adresse, Name, Passwort, Tokens
- Zweck: Ausschließlich Zugangsprüfung durch den Betreiber

---

## Layout-Konventionen – Verbindungen und KI-Verbindungen

Implementiert in: 2025-07 (Auftrag opencode-zugang-und-layout.md)

### Standard-Layout-Muster

Alle eingeloggten Hauptansichten verwenden folgendes Muster (wie Ressourcen, Wissen, Planung):

```html
<section className="view <view-specific-class>">
  <header className="view-header">
    <div className="view-title">
      <h2>Titel</h2>
      <p className="view-sub">Untertitel</p>
    </div>
    <div className="view-header-controls">
      <!-- Aktionsbuttons (optional) -->
    </div>
  </header>
  <div className="<view>-body"> <!-- flex:1, overflow:auto, padding:24px 28px -->
    <!-- Bento-Inhalt, Karten, etc. -->
  </div>
</section>
```

### Angewandte Änderungen

- **`VerbindungenView`**: Von eigenem `verbindungen-view`-Container (ohne `.view`-Wrapper, ohne `.view-header`) auf das Standard-Muster umgestellt. Bento-Grid und -Karten bleiben erhalten. Scrollbarer Body in `.verbindungen-body`.
- **`KIVerbindungView`**: Von `view-container bento-ai` + `bento-hero` auf das Standard-Muster umgestellt. Der „Hinzufügen"-Button wurde in `.view-header-controls` verschoben. KPI-Kacheln, Filter-Chips und Bento-Grid bleiben erhalten. Scrollbarer Body in `.bento-ai-body`.

### CSS

- `.verbindungen-view { overflow: hidden; }` + `.verbindungen-body { flex:1; overflow:auto; padding:24px 28px; max-width:1040px; }`
- `.bento-ai { overflow: hidden; }` + `.bento-ai-body { flex:1; overflow:auto; padding:24px 28px; max-width:960px; }`
- Gemeinsames `.view-header`: `padding:20px 28px`, `border-bottom`, `flex justify-content:space-between` – verhindert Überlagerung von Titel und Button, bricht bei schmalen Breiten sauber um (`flex-wrap` ist via `.view-header-controls` gegeben).
