# OrganAIzer Design System

## Designidee

OpenWebUI-inspiriertes, schwarz/weißes, flaches, professionelles Design. Monochromatisches Farbschema mit klarer Typografie und minimalen visuellen Ablenkungen. Fokus auf Inhalt statt Dekoration.

## Design Tokens

Alle Farben und Abstände werden über CSS Custom Properties (`--var`) definiert und sind in `src/styles/app.css` unter `:root` / `[data-theme="dark"]` und `[data-theme="light"]` deklariert.

### Farben

| Token | Dark | Light | Verwendung |
|---|---|---|---|
| `--bg-base` | `#09090b` | `#ffffff` | Seitenhintergrund |
| `--bg-surface` | `#18181b` | `#fafafa` | Karten, Header, Panels |
| `--bg-elevated` | `#27272a` | `#f4f4f5` | Erhöhte Elemente |
| `--bg-hover` | `#3f3f46` | `#e4e4e7` | Hover-Zustand |
| `--bg-active` | `#52525b` | `#d4d4d8` | Aktiver Zustand |
| `--border` | `#27272a` | `#e4e4e7` | Standard-Rahmen |
| `--border-subtle` | `#1f1f23` | `#f4f4f5` | Subtile Trennlinien |
| `--border-hover` | `#3f3f46` | `#d4d4d8` | Hover-Rahmen |
| `--text-primary` | `#fafafa` | `#09090b` | Primärtext |
| `--text-secondary` | `#a1a1aa` | `#52525b` | Sekundärtext |
| `--text-tertiary` | `#71717a` | `#a1a1aa` | Hints, Labels |
| `--text-inverse` | `#09090b` | `#fafafa` | Invertierter Text |
| `--accent` | `#fafafa` | `#18181b` | Akzent (Buttons, Active-States) |
| `--accent-hover` | `#e4e4e7` | `#27272a` | Akzent Hover |
| `--accent-muted` | `#27272a` | `#f4f4f5` | Gedämpfter Akzent |
| `--success` | `#22c55e` | `#16a34a` | Erfolgsmeldungen |
| `--error` | `#ef4444` | `#dc2626` | Fehlermeldungen |
| `--warning` | `#f59e0b` | `#d97706` | Warnungen |
| `--info` | `#3b82f6` | `#2563eb` | Informationen |

### Radien

| Token | Wert | Verwendung |
|---|---|---|
| `--radius-sm` | `6px` | Buttons, Inputs |
| `--radius-md` | `10px` | Karten, Dropdowns |
| `--radius-lg` | `14px` | Modals, große Karten |
| `--radius-full` | `9999px` | Badges, Avatare |

### Schatten

| Token | Verwendung |
|---|---|
| `--shadow-sm` | Subtile Erhöhung |
| `--shadow-md` | Karten |
| `--shadow-lg` | Modals, Overlays |

## Typografie

- **Font:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Mono:** `'SF Mono', Monaco, 'Fira Code', monospace`
- **h1:** 28px / 600 / -0.5px
- **h2:** 22px / 600 / -0.4px
- **h3:** 17px / 600 / -0.2px
- **h4:** 14px / 600
- **Body:** 14px / 1.5
- **Small/Hint:** 11-12px
- **Eyebrow:** 10px / 700 / 1.5px letter-spacing / uppercase

## Icon Library

**lucide-react** (https://lucide.dev)

- Alle Emoji-Icons wurden durch Lucide-SVG-Icons ersetzt
- Standard-Größe: `size={14}` für Inline, `size={16-18}` für Nav, `size={20}` für Feature-Icons
- Icons werden immer als React-Komponente importiert: `import { Bot } from 'lucide-react'`

Verwendete Icons (Auswahl):
- Navigation: `Bot`, `Calendar`, `CheckSquare`, `Mic`, `Settings`, `LogOut`
- Actions: `Play`, `Download`, `Upload`, `Search`, `X`, `ArrowLeft`, `ArrowRight`
- Status: `Loader2`, `Check`, `ExternalLink`, `AlertTriangle`, `RefreshCw`
- Features: `Sparkles`, `Clock`, `Tag`, `FolderOpen`, `ZoomIn`
- Settings: `Palette`, `Sun`, `Moon`, `Volume2`, `Image`, `ScanText`, `BookOpen`, `ScrollText`
- Logging: `Trash2`, `Filter`, `RefreshCw`, `Download`

## Layout

```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │ Main Area                        │
│ 240px    │ flex: 1                          │
│          │ ┌────────────────────────────────┐│
│ Brand    │ │ View Header                    ││
│ Nav      │ ├────────────────────────────────┤│
│ ...      │ │ Tab Bar (optional)             ││
│          │ ├────────────────────────────────┤│
│ Footer   │ │ Content (scrollable)           ││
│ (User)   │ │                                ││
└──────────┴──┴────────────────────────────────┘
```

- Sidebar: 240px, collapsed to 56px on `<= 820px`
- Kein Router, state-basiertes View-Switching

## Komponenten

| Komponente | Datei | Funktion |
|---|---|---|
| Sidebar | `Sidebar.tsx` | Navigation, User-Info, Settings/Logout |
| LoginScreen | `LoginScreen.tsx` | Auth-Formular |
| AssistentView | `AssistentView.tsx` | OpenWebUI iframe (rahmenlos) mit Load/Error-States |
| TermineView | `TermineView.tsx` | Kalender-Orchestrator |
| WeeklyCalendar | `WeeklyCalendar.tsx` | Wochenkalender-Grid |
| WeekSelector | `WeekSelector.tsx` | KW 1-4 Buttons |
| FilterPanel | `FilterPanel.tsx` | Benutzergruppen/Meeting-Filter |
| AppointmentDetail | `AppointmentDetail.tsx` | Termin-Detail-Modal |
| ImportExport | `ImportExport.tsx` | Excel Import/Export |
| AufgabenView | `AufgabenView.tsx` | Aufgaben-Hub mit Tool-Karten und Templates |
| SpracheView | `SpracheView.tsx` | TTS, STT, YouTube |
| BildGeneratorView | `BildGeneratorView.tsx` | KI-Bildgenerierung |
| WissenView | `WissenView.tsx` | User-isolierte Obsidian-Suche, Navigation, Markdown-Editor, Tags und Änderungsverlauf |
| ConfigView | `ConfigView.tsx` | Settings mit Appearance/Logs-Tabs |
| LoggingPanel | `LoggingPanel.tsx` | Frontend/Backend Log-Anzeige |

## Theme-Konzept

- **Persistenz:** `localStorage` Keys: `organaizer_theme` (dark/light), `organaizer_lang` (de/en)
- **Umschaltung:** In Settings > Appearance via segmentierte Buttons
- **Implementierung:** CSS Custom Properties mit `[data-theme]` Attribut auf `<html>`
- **Context:** `ThemeContext.tsx` stellt `theme`, `lang`, `setTheme`, `setLang`, `t()` bereit
- **Light-Mode-Label:** "Bright" wird intern als `light` gespeichert

## Lokalisierung

- **System:** Custom i18n ohne externe Library (`src/i18n.ts`)
- **Sprachen:** Deutsch (de), English (en)
- **Funktion:** `t(key)` gibt den Text in der aktiven Sprache zurück
- **Fallback:** Gibt den Key selbst zurück, wenn kein Eintrag existiert
- **Alle UI-Texte** der überarbeiteten Bereiche sind übersetzt

## Wissen / Obsidian UX

Die Wissen-Ansicht verwendet vier Arbeitsbereiche: `Suche` (Volltext oder nur Überschriften), `Navigation` (Vault-Baum und Markdown-Editor), `Tags` (Filter und zugehörige Dokumente) sowie `Zuletzt bearbeitet` (sortierbar nach Änderungs- oder Erstellungsdatum). Lade-, Fehler-, Konflikt- und Speicherzustände sind sichtbar. Auf kleinen Bildschirmen wechselt Navigation zwischen Baum und Editor. Die Oberfläche nutzt Tastaturfokus, semantische Buttons, `aria`-Labels und berücksichtigt Reduced Motion.

## Logging-Architektur

### Frontend (`src/logging.ts`)

- **Ring Buffer:** 300 Einträge im Speicher, subscribebare Updates
- **Log-Levels:** `debug`, `info`, `warn`, `error`
- **Log-Sources:** `api`, `app`, `iframe`, `error`
- **Redaktion:** Sensible Felder (password, token, secret, authorization, cookie, api_key) werden automatisch mit `***redacted***` ersetzt
- **Global Error Handlers:** `window.onerror` und `unhandledrejection` werden automatisch erfasst
- **API-Integration:** Jeder `apiFetch()`-Aufruf loggt automatisch Method, Path, Status und Duration
- **Console Output:** Alle Einträge werden zusätzlich (redacted) in die Browser-Konsole geschrieben

### Backend (`backend/api/logging_middleware.py`)

- **Middleware:** Flask `before_request` / `after_request` Hooks
- **Structured Logging:** Jeder Request wird mit Timestamp, Method, Path, Status, Duration, User und Remote-Addr geloggt
- **Ring Buffer:** 500 Einträge im Speicher, thread-safe (threading.Lock)
- **Redaktion:** Headers (Authorization, Cookie, X-API-Key) werden geschwärzt; Body-Felder mit sensitiven Namen werden geschwärzt
- **API Endpoints:**
  - `GET /api/logs?since_id=N` — Polling-Endpunkt für das Frontend
  - `POST /api/logs/clear` — Löscht den Ring Buffer
- **File Logging:** Zusätzlich in `log.txt` über Python `logging` Modul

### Settings-Panel (Logs-Tab)

- **Frontend-Tab:** Zeigt Entries aus `src/logging.ts` in Echtzeit (subscribe-basiert)
- **Backend-Tab:** Pollt alle 3 Sekunden `GET /api/logs?since_id=...`
- **Controls:**
  - Level-Filter (All/Errors/Warnings/Info/Debug) — nur Frontend
  - Refresh-Button
  - Export-Button (JSON-Download)
  - Clear-Button (löscht Frontend-Buffer bzw. POST `/api/logs/clear`)
  - Auto-Scroll-Toggle
- **Darstellung:** Monospace-Tabelle mit farbigen Level-Badges

## Interaktionsmuster

### OpenWebUI-Iframe

- **Laden:** Overlay mit Spinner, Status-Dot gelb/pulsierend
- **Bereit:** Overlay entfernt, Status-Dot grün, "Verbunden"
- **Fehler:** Overlay mit AlertTriangle-Icon, Fehlermeldung, Retry-Button, Status-Dot rot
- **Diagnostik:** Load-Events und -Dauer werden in das Frontend-Log geschrieben
- **Kein Rahmen:** `border: none` auf dem iframe, keine umgebenden Borders

### Buttons

- `.btn-primary` — Gefüllt mit `--accent`, weiße Schrift
- `.btn-secondary` — Border, transparent, für sekundäre Aktionen
- `.btn-ghost` — Kein Border, minimalistisch
- `.icon-btn` — 32x32, für Icon-only Buttons
- `.icon-btn.danger` — Wird rot bei Hover

### Formulare

- Inputs/Selects: `--bg-base` Background, `--border` Rahmen, `--accent` Focus
- Labels: 12px, 600 weight, `--text-secondary`
- Placeholder: `--text-tertiary`
- Toggle/Switch: Custom CSS-only Toggle mit Slider-Animation

## Regeln für spätere Erweiterungen

1. **Neue Farben:** Immer als CSS Custom Property in beiden Themes definieren
2. **Neue Icons:** Ausschließlich `lucide-react` verwenden, keine Emojis
3. **Neue Texte:** In `src/i18n.ts` als Key-Value-Paar für `de` und `en` hinzufügen
4. **Neue Komponenten:** `useTheme()` Hook für `t()` Funktion importieren
5. **CSS-Klassen:** Kebab-case, BEM-ähnlich, alle in `src/styles/app.css`
6. **Keine Inline-Farben:** Immer `var(--token)` verwenden
7. **Responsive:** Mobile-first Breakpoints: 600px, 768px, 820px
8. **Focus-States:** `:focus-visible` mit `outline: 2px solid var(--accent)`
9. **Keine Rahmen** um den OpenWebUI-iframe
10. **Buttons:** Verwende `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.icon-btn`
11. **Logging:** Neue Features sollten relevante Events über `logApp()` loggen
12. **Sensible Daten:** Niemals Tokens/Passwörter in Logs — Redaktion ist automatisch, aber bei manuellen Logs trotzdem beachten
13. **Backend-Routes:** Werden automatisch durch die Middleware geloggt, kein manuelles Logging nötig

## Landingpage (Public Entry)

### Komposition
Nicht-authentifizierte Besucher sehen eine öffentliche Produktseite statt nur eines Login-Formulars.

- **Header:** Sticky, compact. OrganAIzer-Branding, Theme-/Language-Toggle, Login (sekundär) und "Zugang anfragen" (primär).
- **Hero:** Editorialer Split. Links: Eyebrow + Headline + Subtext + zwei CTAs. Rechts: codebasierte Produktvorschau (App-Shell mit Sidebar + Assistent-Mock).
- **Bento-Story:** Ungleichgewichtiges Grid (1.4fr/1fr + full-width). Vier Module: Termine & Planung, Aufgaben & Ressourcen, KI-Verbindungen, Sprache & Wissen.
- **Workflow:** Drei Schritte (Sammeln → Strukturieren → Handeln) mit Connectors.
- **Prinzipien:** Drei Karten (weniger Kontextwechsel, Provider-neutral, eine Arbeitsoberfläche).
- **Final CTA:** Wiederholung der Hero-CTAs.
- **Footer:** Branding + Auth-Hinweis.

### Produktvorschau
React-Komponente `ProductPreview`, die eine miniaturisierte App-Shell rendert (Sidebar mit echten Modulnamen + Assistent-Chat-Mock). Keine Screenshots, keine externen Assets. Klar als Vorschau gekennzeichnet.

### Motion
- `landingFadeUp` Animation (staggered) bei initialem Rendern.
- Respektiert `prefers-reduced-motion: reduce`.
- Hover-Elevationen auf Bento-Zellen und Prinzipien.
- Keine permanenten Loops.

### Auth-Zustände
- `user === undefined` → Spinner (Token-Check läuft)
- `user === null, publicView === 'landing'` → LandingPage
- `user === null, publicView === 'login'` → LoginScreen (mit "Zurück"-Navigation)
- `user !== null` → App-Shell (unverändert)

### Zugang anfragen
Selbstregistrierung bleibt deaktiviert. "Zugang anfragen" öffnet ein barrierearmes `<dialog>`-Formular mit E-Mail-Adresse und Zusatzinformationen. Die Anfrage wird über `POST /api/access-requests` validiert und als offene Anfrage gespeichert; es wird kein Zugang automatisch angelegt und kein Erfolg bei einem Serverfehler vorgetäuscht. Das Backend speichert ausschließlich E-Mail, Zusatzinformationen, Status und Zeitstempel.

### Verbindungsansichten
Die Ansichten "Verbindungen" und "KI-Verbindungen" verwenden denselben `.view`-/`.view-header`-Rhythmus wie Ressourcen, Planung, Aufgaben, Sprache und Wissen. Titel und Untertitel erhalten dadurch einen eigenen Kopfbereich; Aktionen liegen in den Header-Controls und überdecken keine Texte. Der darunterliegende Bento-Inhalt wird in einem gepolsterten, scrollbaren Body mit sichtbarem Abstand zur Sidebar dargestellt.
