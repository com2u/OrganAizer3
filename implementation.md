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

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Plain CSS**: Styling (no framework)

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
2. **Authentication**: Add login/session management
3. **Real-time updates**: WebSocket for multi-user sync
4. **Recurring meetings**: Better handling of interval logic
5. **Conflict detection**: Warn about overlapping appointments
6. **Mobile responsive**: Adapt calendar for small screens
