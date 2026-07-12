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
| `--text-primary` | `#fafafa` | `#09090b` | Primärtext |
| `--text-secondary` | `#a1a1aa` | `#52525b` | Sekundärtext |
| `--text-tertiary` | `#71717a` | `#a1a1aa` | Hints, Labels |
| `--accent` | `#fafafa` | `#18181b` | Akzent (Buttons, Active-States) |
| `--success` | `#22c55e` | `#16a34a` | Erfolgsmeldungen |
| `--error` | `#ef4444` | `#dc2626` | Fehlermeldungen |

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
- Status: `Loader2`, `Check`, `ExternalLink`
- Features: `Sparkles`, `Clock`, `Tag`, `FolderOpen`, `ZoomIn`
- Settings: `Palette`, `Sun`, `Moon`, `Volume2`, `Image`, `ScanText`, `BookOpen`

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
| AssistentView | `AssistentView.tsx` | OpenWebUI iframe (rahmenlos) |
| TermineView | `TermineView.tsx` | Kalender-Orchestrator |
| WeeklyCalendar | `WeeklyCalendar.tsx` | Wochenkalender-Grid |
| WeekSelector | `WeekSelector.tsx` | KW 1-4 Buttons |
| FilterPanel | `FilterPanel.tsx` | Benutzergruppen/Meeting-Filter |
| AppointmentDetail | `AppointmentDetail.tsx` | Termin-Detail-Modal |
| ImportExport | `ImportExport.tsx` | Excel Import/Export |
| AufgabenView | `AufgabenView.tsx` | Aufgaben-Hub mit Tool-Karten und Templates |
| SpracheView | `SpracheView.tsx` | TTS, STT, YouTube |
| BildGeneratorView | `BildGeneratorView.tsx` | KI-Bildgenerierung |
| WissenView | `WissenView.tsx` | Obsidian-Suche |
| ConfigView | `ConfigView.tsx` | Settings mit Appearance-Tab (Theme/Sprache) |

## Theme-Konzept

- **Persistenz:** `localStorage` Keys: `organaizer_theme` (dark/light), `organaizer_lang` (de/en)
- **Umschaltung:** In Settings > Appearance via segmentierte Buttons
- **Implementierung:** CSS Custom Properties mit `[data-theme]` Attribut auf `<html>`
- **Context:** `ThemeContext.tsx` stellt `theme`, `lang`, `setTheme`, `setLang`, `t()` bereit

## Lokalisierung

- **System:** Custom i18n ohne externe Library (`src/i18n.ts`)
- **Sprachen:** Deutsch (de), English (en)
- **Funktion:** `t(key)` gibt den Text in der aktiven Sprache zurück
- **Fallback:** Gibt den Key selbst zurück, wenn kein Eintrag existiert
- **Alle UI-Texte** der überarbeiteten Bereiche sind übersetzt

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
