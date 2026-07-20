# OpenCode Master Auftrag: OrganAIzer 0.1.2 - Aufgaben + Wissen Vollumsetzung

Arbeite im Repository `/home/hermes/OrganAIzer` als Senior Full-Stack-Engineer und UI/UX-Experte.
Setze ALLE folgenden Änderungen vollständig um. Arbeite autonom und gründlich.

## WICHTIGE REGELN
- Committe NICHT (kein git commit)
- Ändere nur die notwendigen Dateien
- Behalte bestehende Funktionalität bei
- Verwende bestehende Design-Tokens (CSS Variablen aus app.css)
- Dark/Light Theme Kompatibilität beibehalten
- Lucide-Icons beibehalten (keine Emojis)
- Responsive Design beachten
- Alle Texte müssen i18n-keys nutzen (de/en)
- Teste den Build am Ende erfolgreich

---

## TEIL A: Aufgaben-Bereich (AufgabenView.tsx + Backend)

### A1: YouTube Download - Vollständige Pipeline

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- Die YouTube-Download-Funktion existiert bereits. Prüfe und korrigiere folgende Punkte:
  1. Der Download-Link muss korrekt funktionieren: Die URL vom Backend ist `/api/youtube/file/<user_hash>/<filename>`. Der Frontend-Link muss die korkette URL sein.
  2. Stelle sicher, dass der `download`-Attribut am `<a>`-Tag korrekt gesetzt ist.
  3. Nach erfolgreichem Download wird ein Download-Link angezeigt mit Dateiname.
  4. Cancel-Button funktioniert bereits (AbortController).
  5. Fehlermeldungen werden angezeigt.
  6. Speichere jeden erfolgreichen Download in der Task-History via `saveTaskHistory()`.

**Backend (`backend/api/routes.py`):**
- Der Endpoint `/api/youtube/download` existiert bereits und nutzt `yt-dlp`.
- Stelle sicher, dass der Datei-Download-Endpoint `/api/youtube/file/<user_hash>/<filename>` korrekt funktioniert und authentifiziert ist.
- Die `as_attachment=True` Option in `send_file` muss gesetzt sein.

### A2: Bildergenerierung - Vollständige Pipeline

**Frontend (`frontend/src/components/BildGeneratorView.tsx`):**
- Die BildGeneratorView existiert bereits mit Prompt, Negative Prompt, Style, Aspect Ratio, Count, Quality.
- Prüfe und korrigiere:
  1. Der API-Aufruf `/api/bilder/generate` muss korrekt funktionieren.
  2. Ergebnisse werden als Grid angezeigt.
  3. Download-Button für jedes Bild: `<a href={url} download>` muss funktionieren.
  4. Fullscreen-View: `window.open(url)` öffnet das Bild in voller Größe.
  5. Cancel-Button funktioniert bereits (AbortController).
  6. Bei Fehlern wird eine Fehlermeldung angezeigt (kein automatisches Fallback auf picsum.photos).
  7. Speichere jede erfolgreiche Generierung in der Task-History via `saveTaskHistory()`.
  8. Der "Prompt verbessern" Button nutzt `/api/hermes/improve-prompt` - falls dieser Endpoint nicht existiert, nutze stattdessen `/api/hermes/execute` mit einem Prompt der den Text verbessert.

**Backend (`backend/api/routes.py`):**
- Der Endpoint `/api/bilder/generate` existiert bereits.
- Er versucht FAL.ai → Hermes API → Hermes Execute Fallback.
- Entferne den picsum.photos Fallback im Frontend komplett - zeige stattdessen die Fehlermeldung vom Backend an.

### A3: OCR (Texterkennung) - Vollständige Pipeline

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- Die OCR-Funktion existiert bereits. Prüfe und korrigiere:
  1. Datei-Auswahl funktioniert.
  2. Clipboard-Paste (Ctrl+V) funktioniert bereits.
  3. Sprachen-Auswahl: Deutsch, Englisch, Französisch, Spanisch, Italienisch.
  4. Cancel-Button funktioniert bereits.
  5. Ergebnis wird angezeigt.
  6. Download als .txt funktioniert bereits.
  7. Copy-to-Clipboard funktioniert bereits.
  8. "Als Aufgabe übernehmen" Button funktioniert bereits.
  9. Speichere jedes erfolgreiche OCR in der Task-History via `saveTaskHistory()`.

**Backend (`backend/api/routes.py`):**
- Der Endpoint `/api/ocr/extract` existiert bereits und nutzt `pytesseract` oder Hermes API Fallback.
- Stelle sicher, dass die Tesseract-Sprachcodes korrekt gemappt werden.

### A4: Internetrecherche - Vollständige Pipeline

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- Die Recherche-Funktion existiert bereits. Prüfe und korrigiere:
  1. Eingabefeld für Suchbegriff/Thema funktioniert.
  2. Tiefe-Auswahl (kurz/ausführlich) funktioniert.
  3. Der API-Aufruf nutzt `/api/hermes/execute` mit dem Prompt.
  4. Ergebnis wird als gerendertes Markdown angezeigt (MDEditor.Markdown).
  5. Download als .md funktioniert.
  6. Cancel-Button funktioniert bereits.
  7. Speichere jede erfolgreiche Recherche in der Task-History via `saveTaskHistory()`.

**Backend (`backend/api/routes.py`):**
- Der Endpoint `/api/hermes/execute` existiert bereits und leitet an Hermes API weiter.
- Die Hermes API nutzt ihre web_search und Synthese-Fähigkeiten.

### A5: "Wissen durchsuchen" durch "Internetrecherche" ersetzen

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- Prüfe, ob die alte "wissen" Tool-Karte bereits durch "recherche" ersetzt wurde.
- Der ToolKey sollte 'recherche' sein (nicht 'wissen').
- Die TOOL_CARDS sollten sein: workflow, recherche, bilder, youtube, ocr.
- Die i18n-Keys für 'tool.recherche' und 'tool.recherche.desc' existieren bereits.
- Es darf KEINE Referenz auf WissenView in AufgabenView geben.

### A6: Cancel-Funktionalität für alle Tasks

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- Alle Tasks haben bereits AbortController:
  - YouTube: `ytAbortRef`
  - OCR: `ocrAbortRef`
  - Recherche: `rechercheAbortRef`
- Bilder: `abortRef` in BildGeneratorView
- Stelle sicher, dass jeder Cancel-Button den jeweiligen AbortController abbricht.
- Bei AbortError soll keine Fehlermeldung angezeigt werden.

### A7: User-spezifische Ausführungs-Historie

**Backend (`backend/api/routes.py`):**
- Endpoints `/api/tasks/history` (GET + POST) existieren bereits.
- Sie nutzen die `task_history` Tabelle mit `user_email` Spalte.
- GET gibt nur die Aufgaben des authentifizierten Users zurück.

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- `loadHistory()` lädt vom Backend.
- `saveTaskHistory()` speichert zum Backend.
- Der "Ausgeführt" Tab zeigt die Historie an.
- Stelle sicher, dass beim Wechsel in den Tab die Historie neu geladen wird.

### A8: Navigation zurück zur Übersicht

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- Klick auf "Aufgaben" in der Sidebar → `setActiveTab('overview')` und `selectTool('overview')`.
- Klick auf den Haken/Checkbox oben rechts → `setActiveTab('overview')` und `selectTool('overview')`.
- Klick auf "Übersicht" Tab → `selectTool('overview')`.
- Klick auf "Zurück" Button → `selectTool('overview')`.

### A9: Templates für wiederkehrende Aufgaben

**Frontend (`frontend/src/components/AufgabenView.tsx`):**
- Die TEMPLATES existieren bereits: new-task, recurring-task, review-task, workflow-init.
- Stelle sicher, dass die Template-Auswahl und das Formular korrekt funktionieren.
- Der "Ausführen" Button sendet den Prompt an `/api/hermes/execute`.
- Nach erfolgreicher Ausführung wird die Aufgabe in der History gespeichert.

---

## TEIL B: Wissen-Bereich (WissenView.tsx)

### B1: Navigation Tree - Ordner by default eingeklappt

**Frontend (`frontend/src/components/WissenView.tsx`):**
- `TreeNodeItem` hat `useState(false)` für `open` - das ist korrekt.
- Alle Ordner sind by default eingeklappt.
- Der Benutzer kann Ordner einzeln aufklappen durch Klick auf das Chevron-Icon.
- Prüfe, dass die Root-Ebene (name: "") ihre Children auf depth=0 rendert.
- Stelle sicher, dass der Tree-Klick auf eine Datei den Editor öffnet (selectedPath wird gesetzt, NoteEditor wird angezeigt).

### B2: Tabelle "Zuletzt bearbeitet" - Modernisierung

**Frontend (`frontend/src/components/WissenView.tsx` + `frontend/src/styles/app.css`):**

Die RecentTab hat aktuell folgende Spalten: Pfad, Geändert, Erstellt.
Führe folgende Änderungen durch:

1. Entferne die "Öffnen"-Button-Spalte (falls noch vorhanden).
2. Die gesamte `<tr>` Zeile muss klickbar sein: `onClick={() => onOpenNote(n.path)}`
3. Die Tabelle hat aktuell eine Lücke zwischen "Pfad" und "Geändert". Das liegt daran, dass die Pfad-Spalte `max-width: 360px` hat, aber kein `width: 100%`.
   - Ändere `.recent-path` CSS: Entferne `max-width: 360px`, setze stattdessen `width: auto` und lasse die Tabelle die Spalten automatisch verteilen.
   - Setze die Tabellenbreite auf 100%.
   - Die Pfad-Spalte soll die verfügbare Breite einnehmen.
4. Modernisiere die Darstellung:
   - Rounded corners auf Zeilen (bereits vorhanden: `border-radius: var(--radius-sm)` bei hover).
   - Bessere Hover-States mit sanfter Transition.
   - Der Dateiname soll prominenter sein (font-weight: 500 für die Pfad-Zelle).
   - Zeitstempel sollen `white-space: nowrap` haben und rechtsbündig ausgerichtet sein.
   - Die sortierbaren Spaltenüberschriften sollen ein deutlicheres Hover-Feedback haben.
5. Füge einen File-Icon vor dem Dateinamen hinzu (bereits vorhanden).

**CSS-Änderungen in `app.css`:**
```css
.recent-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: auto;
}

.recent-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text-tertiary);
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
}

.recent-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
  transition: background 0.12s;
}

.recent-table tr.recent-row { cursor: pointer; }
.recent-table tr.recent-row:hover td {
  background: var(--bg-hover);
}

.recent-path {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-weight: 500;
  word-break: break-all;
}

.recent-ts {
  white-space: nowrap;
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: right;
  min-width: 140px;
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 4px 0;
  font-weight: 500;
  transition: color 0.12s;
}
.sort-btn:hover { color: var(--text-primary); }
```

### B3: WYSIWYG Markdown Editor

**Frontend (`frontend/src/components/WissenView.tsx`):**

Der aktuelle Editor nutzt bereits `@uiw/react-md-editor` (MDEditor).
Der MDEditor bietet WYSIWYG-Funktionalität mit einer Toolbar und Live-Vorschau.

Prüfe und korrigiere:

1. Der MDEditor ist korrekt importiert: `import MDEditor from '@uiw/react-md-editor'`
2. Die `NoteEditor` Komponente nutzt MDEditor:
   ```tsx
   <MDEditor
     value={content}
     onChange={(val) => setContent(val || '')}
     preview="live"
     height="100%"
     visibleDragbar={false}
     hideToolbar={false}
   />
   ```
3. Der Editor zeigt eine Split-View (Editor links + Preview rechts) mit `preview="live"`.
4. Die Toolbar mit Formatierungs-Buttons (Bold, Italic, Heading, List, Link, etc.) ist sichtbar.
5. Der Editor füllt die gesamte Höhe des Containers aus.
6. `data-color-mode="auto"` am Container stellt sicher, dass der Editor sich an das Theme anpasst.

**CSS-Korrekturen in `app.css`:**
```css
.note-md-editor {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.note-md-editor .w-md-editor {
  height: 100% !important;
  border: none !important;
  border-radius: 0 !important;
  flex: 1;
}

.note-md-editor .w-md-editor-toolbar {
  border-bottom: 1px solid var(--border) !important;
}

.note-md-editor .wmde-markdown {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.note-md-editor .w-md-editor-content {
  background: var(--bg-base) !important;
}
```

6. Stelle sicher, dass der FloatingEditor auch den MDEditor nutzt.
7. In der SearchTab und TagsTab werden Dateien über den FloatingEditor geöffnet.

### B4: Alle Markdown-Editoren auf MDEditor umstellen

Prüfe alle Stellen, wo Markdown-Dateien editiert oder betrachtet werden:
1. NavigationTab: `NoteEditor` nutzt MDEditor ✓
2. FloatingEditor: `NoteEditor` nutzt MDEditor ✓
3. In der Recherche-Ansicht (AufgabenView): `MDEditor.Markdown` wird für die Vorschau verwendet ✓

Stelle sicher, dass keine `<textarea>` oder reinen Text-Editoren mehr für Markdown verwendet werden.

---

## TEIL C: Backend-Erweiterungen

### C1: requirements.txt erweitern

**Datei:** `requirements.txt`

Füge folgende Pakete hinzu:
```
flask>=3.0
flask-cors>=4.0
openpyxl>=3.1
python-dotenv>=1.0
pytesseract>=0.3.10
Pillow>=10.0
```

Hinweis: `yt-dlp` ist ein System-Binary, kein Python-Paket. Es muss im Dockerfile installiert werden.

### C2: Dockerfile erweitern

**Datei:** `Dockerfile`

Im `runtime` Stage, vor dem `COPY requirements.txt`, füge System-Paket-Installationen hinzu:
```dockerfile
# Install system dependencies: yt-dlp, ffmpeg (for audio extraction), tesseract-ocr
RUN apt-get update && apt-get install -y --no-install-recommends \
    yt-dlp \
    ffmpeg \
    tesseract-ocr \
    tesseract-ocr-deu \
    tesseract-ocr-eng \
    tesseract-ocr-fra \
    tesseract-ocr-spa \
    tesseract-ocr-ita \
    && rm -rf /var/lib/apt/lists/*
```

Dies muss VOR dem `COPY requirements.txt` passieren, damit die System-Pakete verfügbar sind.

### C3: Hermes API improve-prompt Endpoint

**Datei:** `backend/api/routes.py`

Füge einen neuen Endpoint hinzu für Prompt-Verbesserung:
```python
@api_bp.route("/hermes/improve-prompt", methods=["POST"])
def hermes_improve_prompt():
    """Improve a text prompt using Hermes API."""
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text ist erforderlich"}), 400

    config = _read_config()
    hermes_url = config.get("hermes_api_url", "")
    if not hermes_url:
        # Local fallback: just add quality boosters
        return jsonify({"improved": f"{text}, highly detailed, professional quality, masterful composition"})

    import urllib.request
    try:
        prompt = f"Verbessere folgenden Bild-Prompt für bessere KI-Bildgenerierung. Gib nur den verbesserten Prompt zurück, keine Erklärung: {text}"
        req_data = json.dumps({"prompt": prompt}).encode("utf-8")
        req = urllib.request.Request(
            f"{hermes_url}/api/v1/execute",
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
        improved = resp_data.get("result") or resp_data.get("response") or text
        return jsonify({"improved": improved})
    except Exception as e:
        logger.warning("Hermes improve-prompt failed: %s", type(e).__name__)
        return jsonify({"improved": f"{text}, highly detailed, professional quality, masterful composition"})
```

---

## TEIL D: Version und i18n

### D1: Version erhöhen

**Datei:** `frontend/package.json`
- Ändere `"version": "0.1.1"` zu `"version": "0.1.2"`

**Datei:** `backend/config.py`
- Falls eine VERSION-Variable existiert, erhöhe auf "0.1.2"

### D2: i18n-Keys prüfen

**Datei:** `frontend/src/i18n.ts`

Prüfe, dass alle benötigten i18n-Keys vorhanden sind:
- `tool.recherche`, `tool.recherche.desc` ✓
- `tool.youtube`, `tool.youtube.desc` ✓
- `tool.ocr`, `tool.ocr.desc` ✓
- `tool.bilder`, `tool.bilder.desc` ✓
- `tool.workflow`, `tool.workflow.desc` ✓
- `recherche.*` keys ✓
- `ocr.*` keys ✓
- `yt.*` keys ✓
- `bilder.*` keys ✓
- `cancel` ✓
- `aufgaben.*` keys ✓

Falls Keys fehlen, füge sie hinzu (de/en).

---

## TEIL E: Verifikation

Nach allen Änderungen führe folgende Schritte aus:

1. `cd /home/hermes/OrganAIzer/frontend && npm install`
2. `cd /home/hermes/OrganAIzer/frontend && npx tsc --noEmit` (TypeScript-Prüfung)
3. `cd /home/hermes/OrganAIzer/frontend && npm run build` (Production-Build)
4. `cd /home/hermes/OrganAIzer && python3 -m py_compile backend/api/routes.py` (Python-Syntax)

Behebe alle Fehler, die auftreten.

---

## ZUSAMMENFASSUNG DER DATEIEN

Dateien, die geändert werden müssen:
1. `frontend/src/components/AufgabenView.tsx` - Prüfung und Korrekturen
2. `frontend/src/components/BildGeneratorView.tsx` - Fehlerbehandlung, Download
3. `frontend/src/components/WissenView.tsx` - Tree, Tabelle, Editor
4. `frontend/src/styles/app.css` - CSS-Korrekturen
5. `frontend/src/i18n.ts` - Fehlende Keys ergänzen falls nötig
6. `backend/api/routes.py` - improve-prompt Endpoint
7. `requirements.txt` - pytesseract, Pillow
8. `Dockerfile` - yt-dlp, ffmpeg, tesseract-ocr
9. `frontend/package.json` - Version 0.1.2

Arbeite alle Teile nacheinander ab. Beginne mit Teil A (Aufgaben), dann Teil B (Wissen), dann Teil C (Backend), dann Teil D (Version/i18n), dann Teil E (Verifikation).
