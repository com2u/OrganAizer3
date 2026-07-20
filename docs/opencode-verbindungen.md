# OpenCode-Auftrag: Verbindungen-Templates und Verbindungsverwaltung

Du arbeitest autonom im Repository `/home/hermes/OrganAIzer` an OrganAIzer. Der Benutzer möchte links im Navigationsmenü einen neuen Eintrag `Verbindungen`. Diese Ansicht ist eine vorbereitete Integrationsverwaltung: Sie zeigt auswählbare Templates für mögliche Verbindungen als Bento-Boxen/Button-Karten mit individuellem Lucide-Icon, Titel und sehr kurzer Beschreibung (2–3 Worte). Ein Benutzer kann ein Template auswählen und als Verbindung hinzufügen. Unterhalb der Templates wird eine Liste der bereits hinzugefügten Verbindungen angezeigt. Die eigentliche OAuth-/API-/Provider-Ausprogrammierung erfolgt später; jetzt sollen nur sichere, ehrliche Templates und die Verwaltung der Metadaten funktionieren.

## Verbindungs-Templates

Implementiere diese Einträge exakt und ohne stillschweigende Umbenennung, offensichtliche Tippfehler jedoch sinnvoll korrigieren bzw. im UI korrekt anzeigen:

- Office (Word, Excel, PowerPoint)
- Outlook Kalender
- Outlook Mail
- Outlook Kontakte
- Outlook Aufgaben
- Google Kalender
- OneNote
- SharePoint
- Google Mail
- Google Kontakte
- Google Aufgaben
- OneDrive
- JIRA
- Confluence
- n8n
- MCP

## Arbeitsweise und Grenzen

1. Lies zuerst `AGENTS.md`, `CLAUDE.md`, `.cursorrules` falls vorhanden, danach mindestens `design.md`, `implementation.md`, `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/KIVerbindungView.tsx`, `frontend/src/api.ts`, `frontend/src/types.ts`, `frontend/src/i18n.ts`, `frontend/src/styles/app.css`, `backend/server.py`, `backend/db/models.py` sowie die Auth-/DB-Muster. Respektiere alle bestehenden uncommitted Änderungen; überschreibe keine fremden Features.
2. Nutze vorhandene React-/TypeScript-/Lucide-/i18n-Konventionen. Keine externen Logo-CDNs, keine erfundenen Provider-Erfolge und keine Fake-OAuth-Flows.
3. Frontend-API-Aufrufe dürfen ausschließlich über den vorhandenen authentifizierten `apiFetch`-Mechanismus laufen.
4. Keine Secrets, Tokens, Passwörter, API-Schlüssel oder Verbindungsstrings lesen, loggen, ausgeben oder speichern. Für Templates und hinzugefügte Verbindungen werden nur Metadaten bzw. ein sicherer Status gespeichert.
5. Die neue Funktion muss responsiv, in Dark/Light Theme gut lesbar, keyboard-bedienbar und visuell passend zur OpenWebUI-inspirierten Bento-Oberfläche sein.
6. Die neue Ansicht ist nicht die bestehende KI-Verbindungsansicht. `KI Verbindung` bleibt erhalten. Der neue Navigationspunkt soll `Verbindungen` heißen und separat erreichbar sein.

## Erwartete Umsetzung

### Navigation und Routing

- Ergänze einen neuen `CategoryKey` und einen Sidebar-Eintrag `Verbindungen` mit passendem Lucide-Icon, sinnvoll in der unteren Integrations-/Konfigurationsgruppe platziert.
- Ergänze das App-Routing und eine eigene View-Komponente, z.B. `VerbindungenView.tsx`.
- Ergänze deutsche und englische i18n-Texte für Navigation, View, Templates, Status, Empty State, Dialoge und Fehler.

### Datenmodell und API

- Führe eine eigene idempotente SQLite-Tabelle für hinzugefügte Verbindungen ein, z.B. `verbindungen`, mit ID, Template-Key, Name/Label, Status, optionaler Beschreibung/Metadaten und Zeitstempeln. Keine Secret-Felder.
- Registriere ein authentifiziertes Blueprint/API mit List/Create/Update/Delete bzw. mindestens List/Create/Delete, passend zu den bestehenden API-Mustern. Validierung nur gegen die feste Template-Allowlist; unbekannte Template-Keys ablehnen.
- Das Hinzufügen darf zunächst nur eine konfigurierte Platzhalter-Verbindung anlegen: Status `Vorbereitet`/`prepared`, keine behauptete Erreichbarkeit. Der Benutzer soll erkennen, dass die echte Konfiguration später folgt.
- Fehlerantworten konsistent als JSON, Authentifizierung erzwingen, SQL parameterisieren, keine internen Pfade oder Secrets ausgeben.
- Idempotente Schema-Erweiterung in der bestehenden Startup-Erstellung. Bestehende Daten und uncommitted Änderungen erhalten.

### Frontend UX

- Hero mit Titel `Verbindungen`, kurzer Erklärung, optionalem Hinweis `Templates – spätere Konfiguration`.
- Template-Bereich oberhalb der hinzugefügten Verbindungen. Bento-Grid mit variierenden Kartenbreiten bzw. visueller Gewichtung, aber nicht überladen.
- Jede Template-Karte/Button zeigt:
  - individuelles Lucide-Icon bzw. eindeutige Icon-Kombination,
  - prägnanten Namen,
  - 2–3-Wort-Beschreibung,
  - klaren Add-Affordance/Button `Hinzufügen`.
- Klick auf Karte darf in einem kleinen Dialog oder Inline-Panel den Verbindungsnamen bestätigen/bearbeiten und anschließend die vorbereitete Verbindung speichern.
- Bereits hinzugefügte Verbindungen darunter als responsive Bento-/Listenkarten mit Icon, Name, Template, Status `Vorbereitet`, Datum falls vorhanden und Löschen-Aktion. Keine Test-/Connect-Aktion vortäuschen.
- Loading-, Fehler-, Leer- und Erfolgssituationen implementieren. Nach Create/Delete die Liste korrekt neu laden.
- Semantische Buttons, sichtbare Fokuszustände, `aria-label` für Icon-only Aktionen. Mobile Darstellung sauber.
- Keine harte direkte `fetch`-Nutzung.

## Qualitäts- und Verifikationsanforderungen

- Führe nach der Implementierung die relevanten Builds/Checks aus, aber ändere keine Secrets und committe/pushe nichts.
- `npm run build` im Frontend.
- `python3 -m compileall -q backend` und `git diff --check`.
- Schreibe bei Bedarf fokussierte temporäre Prüfungen ausschließlich unter `/tmp` mit `tempfile` und Prefix `hermes-verify-`; nach Ausführung entfernen.
- Prüfe gezielt: Sidebar/Routing vorhanden, alle 16 Templates vorhanden, API nutzt Auth, Allowlist validiert, Tabelle idempotent, keine Secret-Felder, `apiFetch` wird verwendet, Empty State und vorbereiteter Status im Bundle/Source vorhanden.
- Prüfe die laufende UI soweit möglich mit Browser-/HTTP-Smoke-Checks. Ungeschützte API-Aufrufe müssen 401 liefern. Keine echten Providerverbindungen aufrufen.
- Keine vollständige Integration mit Microsoft/Google/JIRA/n8n/MCP implementieren; dies ist ausdrücklich später.
- Aktualisiere `implementation.md` mit Datenmodell, API, Template-Allowlist, Sicherheitsgrenzen und bewusstem Vorbereitungsstatus.
- Aktualisiere bei Bedarf nur den projektspezifischen Deployment-/OrganAIzer-Skill um die neue Verbindungsverwaltung und Verifikationsregeln.
- Gib am Ende eine präzise Zusammenfassung der geänderten Dateien und real ausgeführten Checks aus.

## Wichtige Nebenbedingungen

- Nicht committen und nicht pushen.
- Keine bestehenden Features entfernen oder umbenennen.
- Keine Zugangsdaten aus Dateien oder Umgebungsvariablen anzeigen.
- Wenn ein Teil wegen fehlender Providerimplementierung nur vorbereitet werden kann, im UI und in der Dokumentation ehrlich als `Vorbereitet`/`prepared` kennzeichnen.

Arbeite jetzt die Änderungen vollständig im aktuellen Repository aus. Beginne mit Inspektion, implementiere dann Backend und Frontend, baue und verifiziere die Lösung.
