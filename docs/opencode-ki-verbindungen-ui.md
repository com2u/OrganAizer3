# OpenCode Prompt: KI-Verbindungen Bento-UI

Du arbeitest im Repository `/home/hermes/OrganAIzer` an OrganAIzer, einer React/TypeScript/Vite-Frontend- und Flask/SQLite-Backend-Anwendung. Implementiere die Verbesserung der Ansicht „KI Verbindungen“ produktionsreif. Arbeite autonom, aber lies zuerst die relevanten Dateien und bestehenden Projektregeln. Verändere nur, was für dieses Feature nötig ist, und respektiere vorhandene uncommitted Änderungen: überschreibe keine fremden Arbeiten ohne sie zu verstehen.

## Ziel

Die bestehende KI-Verbindungen-Ansicht soll eine moderne, ruhige OpenWebUI-nahe Bento-Box-Oberfläche erhalten. Nutzer sollen Verbindungen schnell verstehen, hinzufügen, bearbeiten, testen, aktivieren/deaktivieren und löschen können. Die UX muss auf Desktop und kleinen Screens funktionieren und Dark/Light Theme berücksichtigen.

## Relevante Dateien prüfen

- `frontend/src/components/KIVerbindungView.tsx`
- `frontend/src/styles/app.css`
- `frontend/src/api.ts`
- `frontend/src/types.ts`
- `frontend/src/i18n.ts`
- `frontend/src/App.tsx`
- `backend/api/ai_connections_routes.py`
- `backend/db/models.py`
- `backend/server.py`
- `README.md`, `implementation.md`

Suche zusätzlich nach bestehenden Komponenten, Design-Tokens, Übersetzungsmustern und Test-/Build-Konventionen. Prüfe vor Änderungen `git status`.

## UX/UI-Anforderungen

1. Ersetze die einfache Kategorie-Liste durch eine klare Bento-Struktur:
   - Hero-/Summary-Bereich mit Titel, Beschreibung und primärem „Verbindung hinzufügen“-Button.
   - KPI-Kacheln für Gesamtzahl, aktive Verbindungen und konfigurierte Secrets.
   - Kategorie-/Filter-Chips für Alle, Lokal, Eigenbetrieb und Cloud mit Counts.
   - Responsive Bento-Grid mit unterschiedlich gewichteten Karten (nicht nur eine uniforme Liste).
2. Jede Verbindungskarte zeigt auf einen Blick:
   - Provider-Icon/Monogramm bzw. eindeutige visuelle Identität ohne externe Bildabhängigkeit.
   - Name, Provider, Kategorie, Modell und relevante Endpoint-/Region-Information.
   - Aktiv/Inaktiv-Status, Secret-konfiguriert/fehlt und Teststatus.
   - Letzte Aktion bzw. Testergebnis in verständlicher Form.
   - Primäre Aktion „Testen“, sekundäre Bearbeiten/Löschen-Aktionen; Löschbestätigung muss zugänglich bleiben.
3. Testfeedback muss direkt auf der betroffenen Karte erscheinen. Statusfarben dürfen nicht das einzige Signal sein: Icon plus Text verwenden. `unsupported`, `inactive`, `ok/configured` und `error` klar unterscheiden.
4. Formular-UX verbessern:
   - Als Modal/Drawer oder gut fokussierter Editor mit klarer Gliederung.
   - Provider-Auswahl mit verständlichen Kategorien und kontextabhängigen Feldern.
   - Secret niemals vorbefüllen oder anzeigen; erklären, dass nur eine Umgebungsvariablen-Referenz gespeichert wird.
   - Inline-Validierung, disabled/loading states, Escape-Schließen und sinnvolle Fokusführung, soweit mit vorhandener Architektur möglich.
5. Responsive Verhalten für ca. 320px bis Desktop; keine horizontalen Überläufe. Gute Tastaturbedienbarkeit, sichtbare Focus-States, aria-labels für Icon-only buttons, semantische Überschriften und respektierte `prefers-reduced-motion`.
6. Bestehende Übersetzungsarchitektur verwenden. Alle neuen sichtbaren Texte in Deutsch und Englisch ergänzen; keine hart codierten UI-Texte, wenn i18n bereits vorgesehen ist.
7. Bestehende Theme-Tokens verwenden und CSS am Ende/bei passender Sektion ergänzen, nicht die komplette `app.css` ersetzen. Keine neue UI-Bibliothek installieren, wenn nicht zwingend erforderlich.

## Backend-Anforderungen

- Prüfe, ob die bestehende API für die neue UX ausreicht. Ergänze nur sinnvolle, sichere Felder (z. B. optionaler Zeitstempel/Status nur wenn sauber persistiert oder aus bestehendem Ergebnis ableitbar).
- Geheimnisse bleiben strikt redigiert. Niemals `secret_ref` oder Secret-Werte an das Frontend geben oder loggen.
- Authentifizierung, Provider-Allowlist, SSRF-Schutz für lokale Healthchecks und ehrliche `unsupported`-Antworten beibehalten.
- SQLite-Schemaänderungen müssen idempotent beim App-Start funktionieren; keine Tabellen beim normalen Start leeren.
- Falls Backend nicht geändert werden muss, dokumentiere das ausdrücklich statt unnötige API zu erweitern.

## Qualitätssicherung

1. Führe nach der Implementierung `cd frontend && npm run build` aus und behebe alle TypeScript-/Build-Fehler.
2. Führe `python3 -m compileall -q backend` und `git diff --check` aus.
3. Prüfe die geänderten Verträge mit einem temporären Verifier unter `/tmp` (keine Scratch-Datei im Repo): Auth-Schutz, Secret-Redaktion, API-Status und ggf. Schema.
4. Starte, sofern möglich, die Anwendung/Docker-Umgebung und teste die Ansicht mit Browser/Playwright oder einem verfügbaren Browser-Tool: Laden, Filter, Hinzufügen/Abbrechen, Formularvalidierung, Speichern, Testen, Löschen, Theme und Responsive Layout. Wenn Auth die Live-UI verhindert, führe lokale Tests mit isolierter Konfiguration aus und dokumentiere den konkreten Blocker.
5. Prüfe Browser-Konsole auf Exceptions und Netzwerkfehler. Iteriere mindestens so lange, bis keine von dir eingeführten Fehler bestehen.
6. Aktualisiere `README.md` und `implementation.md` mit der neuen Bento-UX, dem API-Verhalten und den Verifikationsschritten. Keine Secrets dokumentieren.
7. Berichte am Ende die exakten geänderten Dateien und die realen Befehlsausgaben/Testergebnisse. Erstelle keinen Commit, außer es wird ausdrücklich verlangt.

## Definition of Done

- Moderne, visuell konsistente Bento-Ansicht mit Summary, Filtern und responsiven Verbindungskarten.
- CRUD, Test, Loading, Fehler, Empty-State und Statusfeedback funktionieren weiter.
- Keine Secrets im UI/API-Response/Log.
- Deutsch/Englisch vollständig für neue sichtbare Texte.
- Frontend-Build, Backend-Compile und Diff-Check erfolgreich.
- Dokumentation aktualisiert.
- Keine unverified claims; verbleibende Einschränkungen konkret nennen.

Beginne jetzt mit der Inspektion, implementiere anschließend die Änderungen vollständig und verifiziere sie real.
