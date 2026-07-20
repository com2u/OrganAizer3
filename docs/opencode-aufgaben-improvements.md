# OpenCode Auftrag: Aufgaben-Bereich Verbesserungen

Arbeite im Repository `/home/hermes/OrganAIzer` als Senior Full-Stack-Engineer und UI/UX-Experte. Setze die folgenden UI/UX-Verbesserungen im Aufgaben-Bereich (AufgabenView) vollständig um.

## Aktueller Stand
- `frontend/src/components/AufgabenView.tsx` hat bereits Tool-Karten für: workflow, wissen, bilder, youtube, ocr
- YouTube Download und OCR sind bereits implementiert aber teilweise unvollständig
- BildGeneratorView.tsx existiert bereits mit Prompt, Negative Prompt, Style, Aspect Ratio, Count, Quality
- Backend hat bereits /api/youtube/download, /api/ocr/extract, /api/hermes/execute
- Es gibt noch KEIN /api/bilder/generate Endpoint im Backend
- Die "wissen" Tool-Karte rendert WissenView - das soll durch Internetrecherche ersetzt werden
- Keine Cancel-Funktionalität
- Ausgeführt-Tab ist nur im Speicher (nicht user-spezifisch)

## Aufgabe 1: "Wissen durchsuchen" durch "Internetrecherche" ersetzen
**Datei:** `frontend/src/components/AufgabenView.tsx`

- Ändere den ToolKey von 'wissen' zu 'recherche'
- Ersetze die TOOL_CARDS entry von `wissen` zu `recherche` mit:
  - icon: Search
  - titleKey: 'tool.recherche' 
  - descKey: 'tool.recherche.desc'
- Ersetze die renderTool() Logik:
  - Entferne `if (selectedTool === 'wissen') return <WissenView />`
  - Füge `if (selectedTool === 'recherche') return <InternetRecherche />` hinzu
- Erstelle eine neue InternetRecherche Component:
  - Eingabefeld für Suchbegriff/Thema
  - Optionales Feld für "Tiefe" (kurz/ausführlich)
  - Button zum Suchen
  - Ergebnis als gerendertes Markdown (nutze MDEditor preview="preview" oder react-markdown)
  - Download-Button für das Ergebnis als .md Datei
  - Cancel-Button zum Abbrechen
  - Nutze den Hermes Execute Endpoint: `POST /api/hermes/execute` mit Prompt: "Recherchiere im Internet zum Thema: {query}. Erstelle eine ausführliche Zusammenfassung."
  - Importiere MDEditor von '@uiw/react-md-editor' und nutze es für die Vorschau

## Aufgabe 2: Cancel-Funktionalität für alle Tasks
**Datei:** `frontend/src/components/AufgabenView.tsx`

- Füge einen globalen `abortController` State hinzu
- Für jeden Task-Typ (YouTube, OCR, Bilder, Hermes Execute) einen Abbrechen-Button hinzufügen
- Der Abbrechen-Button soll den AbortController abbrechen und den State zurücksetzen
- Implementiere AbortController für alle API-Aufrufe:
  - `fetch('/api/...')` mit `{ signal: abortController.signal }`
  - Catch Error für `AbortError` um sauber abzubrechen
- Für Hermes Execute: Füge ein `hermesAbort` hinzu, das den AbortController nutzt

## Aufgabe 3: User-spezifische Ausführungs-Historie
**Datei:** `frontend/src/components/AufgabenView.tsx` + `backend/api/routes.py`

### Backend:
- Füge neuen Endpoint hinzu: `GET /api/tasks/history` mit User-Auth
  - Gibt alle ausgeführten Aufgaben des authentifizierten Users zurück
  - Struktur: `[{ id, user_email, name, date, status, result }]`
- Füge neuen Endpoint hinzu: `POST /api/tasks/history` mit User-Auth
  - Speichert eine neue Aufgabe: `{ name, status, result? }`
- Nutze SQLite Tabelle `task_history` mit Spalten: id, user_email, name, date, status, result
- Erstelle die Tabelle falls nicht vorhanden

### Frontend:
- Lade die Historie beim Wechsel in den "Ausgeführt" Tab vom Backend
- Speichere jede ausgeführte Aufgabe via POST an /api/tasks/history
- Zeige nur die Aufgaben des eingeloggten Users

## Aufgabe 4: YouTube Download prüfen und verbessern
**Dateien:** `frontend/src/components/AufgabenView.tsx`, `backend/api/routes.py`

- Prüfe ob der YouTube Download korrekt funktioniert
- Füge Cancel-Button hinzu
- Stelle sicher, dass der Download-Link korrekt funktioniert (download Attribut)
- Füge Fortschrittsanzeige hinzu (Loading Spinner + Text)
- Füge Fehlerbehandlung hinzu

## Aufgabe 5: Bildergenerierung - Backend Endpoint hinzufügen
**Datei:** `backend/api/routes.py`

- Füge neuen Endpoint hinzu: `POST /api/bilder/generate`
  - Body: `{ prompt, negative_prompt, style, width, height, count, quality }`
  - Nutze die Hermes API (image_generate tool) oder FAL.ai API
  - WICHTIG: Prüfe ob Hermes als MCP-Server läuft oder ob ein FAL.ai API Key existiert
  - Fallback: Nutze Hermes Execute mit dem Prompt "Generiere ein Bild mit folgendem Prompt: {prompt}"
  - Speichere generierte Bilder unter /app/media/images/ (Docker Volume)
  - Gib zurück: `{ image_urls: [...], prompt }`

### Frontend BildGeneratorView:
- Prüfe ob die aktuelle BildGeneratorView.tsx korrekt funktioniert
- Stelle sicher, dass der Download-Button funktioniert
- Füge Cancel-Button hinzu

## Aufgabe 6: OCR verbessern - Clipboard + Download
**Datei:** `frontend/src/components/AufgabenView.tsx`

- Füge Clipboard-Paste hinzu: Benutzer kann Bild aus Clipboard einfügen
  - Event Listener für 'paste' Event
  - Clipboard-Daten als File erstellen
  - Automatisch das Bild laden
- Füge Download-Button für OCR-Ergebnis hinzu:
  - Button zum Herunterladen des erkannten Textes als .txt Datei
- Füge Cancel-Button hinzu
- Füge Sprachen-Auswahl erweitern: Deutsch, Englisch, Französisch, Spanisch, Italienisch

## Aufgabe 7: Version um 0.0.1 erhöhen
**Dateien:** `frontend/package.json`, `backend/config.py`, `README.md`

- Erhöhe Version von 0.1.0 auf 0.1.1 (oder 0.1.2)
- Passe alle relevanten Stellen an

## Aufgabe 8: Navigation zurück zur Übersicht
**Datei:** `frontend/src/components/AufgabenView.tsx`

- Stelle sicher, dass:
  - Klick auf "Aufgaben" in der Sidebar → Zurück zur Übersicht (overview)
  - Klick auf Checkbox/Haken oben rechts → Zurück zur Übersicht
  - Klick auf "Zurück" Buttons → Korrekte Navigation

## Design-Richtlinien
- Bestehende Design-Tokens (CSS Variablen) verwenden
- Lucide-Icons beibehalten
- Dark/Light Theme Kompatibilität beibehalten
- Kein Emoji
- Responsive Design beachten
- Füge neue CSS-Klassen in `frontend/src/styles/app.css` hinzu

## i18n (Deutsch/Englisch)
- Füge neue Übersetzungen in `frontend/src/i18n.ts` hinzu
- Keys für Internetrecherche, Cancel, Download OCR, etc.

## Dateien die geändert werden MÜSSEN:
1. `frontend/src/components/AufgabenView.tsx` - Hauptänderungen
2. `frontend/src/components/BildGeneratorView.tsx` - prüfen/verbessern
3. `frontend/src/styles/app.css` - CSS-Updates
4. `frontend/src/i18n.ts` - neue Übersetzungen
5. `frontend/src/api.ts` - neue API-Functions falls nötig
6. `backend/api/routes.py` - neue Endpoints
7. `frontend/package.json` - Version
8. `backend/config.py` - Version

## Verifikation
Nach allen Änderungen:
1. `cd frontend && npm install`
2. `cd frontend && npm run build`
3. `cd backend && python3 -m compileall -q`
4. Prüfe TypeScript Fehler: `cd frontend && npx tsc --noEmit`

## WICHTIG
- Committe nicht
- Ändere nur die notwendigen Dateien
- Behalte bestehende Funktionalität bei
- Teste den Build erfolgreich
- Arbeite autonom und vollständig
