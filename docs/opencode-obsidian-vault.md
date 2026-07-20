# OpenCode Auftrag: User-isolierte Obsidian-Wissensdatenbank in OrganAIzer

Arbeite im Repository `/home/hermes/OrganAIzer` als Senior Full-Stack-Engineer, Security Engineer und UI/UX-Experte. Setze die folgende Funktion vollständig um, ohne bestehende uncommitted Änderungen zu überschreiben oder zu committen.

## Ziel
Das Obsidian-Wissen liegt hostseitig unter `/home/hermes/obsidian/<user-email>/` als Markdown-Vault. OrganAIzer soll im Bereich Wissen eine echte, user-isolierte Arbeitsoberfläche bieten:

1. Volltextsuche über alle `.md`-Dateien.
2. Suche ausschließlich in Markdown-Überschriften.
3. Tab `Navigation` mit Dateibaum, Auswahl und Editieren von Notizen.
4. Tab `Tags` mit aus dem Vault extrahierten Tags, Filter/Suche und Öffnen/Editieren der zugehörigen Dokumente.
5. Tab `Zuletzt bearbeitet` mit Änderungsdatum und Erstellungsdatum, sortierbar nach beiden Feldern, und Editieren aus der Liste.
6. Markdown-Editor über eine etablierte, gute Library. Bevorzuge eine bereits verfügbare Dependency; falls nötig, ergänze eine gepflegte React-Library mit Lockfile. Editor muss Markdown-Text bearbeiten, nicht nur HTML anzeigen. Prüfe Bundle-/Dependency-Auswirkungen.
7. Docker mountet den Obsidian-Basisordner und Backend greift ausschließlich auf das Verzeichnis des authentifizierten Benutzers zu. Beispiel: User `paddy22@gmx.de` darf nur `/app/obsidian/paddy22@gmx.de` lesen/schreiben.

## Sicherheitsanforderungen (höchste Priorität)
- Alle Wissens-API-Routen bleiben hinter `auth.enforce_auth()`.
- User-E-Mail kommt ausschließlich aus validiertem `g.user`/OpenWebUI-Token, niemals aus einem frei wählbaren Request-Feld.
- Erzeuge per `safe_vault_for_user(user_email)` einen Pfad unter konfiguriertem Mount. E-Mail als Verzeichnisname exakt oder über eine sichere, dokumentierte Normalisierung; kein `../`, keine absoluten Pfade, keine Symlinks außerhalb des User-Vaults.
- Alle Pfadparameter werden mit `Path.resolve()` gegen User-Root geprüft (`relative_to`); nur `.md`-Dateien dürfen gelesen/geschrieben werden. Verzeichnisse und Obsidian-Konfigurationsdateien bleiben geschützt.
- Symlink-Escape verhindern: reject symlink files/directories or verify resolved path remains below user root.
- Keine Directory-Traversal-, arbitrary-file-read-, arbitrary-file-write- oder SSRF-Möglichkeiten.
- Atomisches Schreiben (Temp-Datei im gleichen Verzeichnis + os.replace), UTF-8, maximale Dateigröße und maximale Request-Größe sinnvoll begrenzen.
- Optional optimistic concurrency: client sendet `updated_at`/mtime und Backend gibt Konflikt statt fremde Änderungen still zu überschreiben.
- API-Antworten enthalten keine Hostpfade, nur relative Vault-Pfade.
- Tags und Such-Snippets dürfen keine Secrets/Passwörter in Logs schreiben; Request-Logging bleibt redigiert.
- Fehlender Benutzer-Vault wird als sauberer leerer Zustand/404 behandelt, niemals Fallback auf einen anderen User.

## Vorarbeit
Lies zuerst:
- `design.md`, `implementation.md`, `README.md`
- `docker-compose.yml`, `Dockerfile`, `.env.example`
- `backend/auth.py`, `backend/api/routes.py`, `backend/server.py`, `backend/config.py`
- `frontend/src/components/WissenView.tsx`, `frontend/src/components/AufgabenView.tsx`, `frontend/src/App.tsx`, `frontend/src/api.ts`, `frontend/src/types.ts`, `frontend/src/i18n.ts`, `frontend/src/styles/app.css`
- `frontend/package.json`
- vorhandene Obsidian-Skill-Dokumentation als Hintergrund, aber die Repo-Architektur und Sicherheitsregeln gewinnen.

Prüfe die echte Vault-Struktur unter `/home/hermes/obsidian` und verwende keine Inhalte/PII als Testausgabe.

## Backend/API
Implementiere bevorzugt in einem eigenen Modul, z.B. `backend/api/obsidian_routes.py`, und registriere es in `server.py`. Endpoints unter `/api/obsidian` oder `/api/wissen` nach bestehender Konvention. API-Vertrag sauber typisieren und dokumentieren. Sinnvolle Endpoints:

- `GET /api/obsidian/tree` → Baum aus Ordnern und `.md`-Dateien, relative Pfade, file metadata.
- `GET /api/obsidian/search?q=...&mode=fulltext|headings&limit=...` → Treffer mit path/title/snippet/line/tags/mtime.
- `GET /api/obsidian/tags?q=...` → Tags mit count und relativen Dateien; Tag-Suche case-insensitive.
- `GET /api/obsidian/recent?sort=modified|created&order=desc|asc&limit=...` → Notizen mit beiden Timestamps.
- `GET /api/obsidian/note?path=...` → Inhalt plus relative path, size, mtime, created timestamp.
- `PUT /api/obsidian/note` mit `{path, content, expected_mtime?}` → sicher speichern; nur `.md`.

Volltextsuche muss `.md` rekursiv durchsuchen. Überschriftensuche erkennt Markdown ATX (`#`) und Setext (`===`, `---`) robust genug. Frontmatter nicht als normale Überschrift werten. Tags aus Obsidian-Formaten extrahieren (`#tag`, nested `#project/one`, YAML frontmatter `tags:`), normalisieren und deduplizieren. Snippets begrenzen.

Erstellungsdatum: nutze `st_birthtime` falls verfügbar, sonst stabile Fallback-Strategie dokumentieren (z.B. mtime, ohne falsche Präzision). Änderungsdatum aus stat. Sortierung serverseitig.

Tests: sichere Pfadauflösung, Traversal, Symlink, user isolation, search fulltext/headings, tag extraction, tree, read/write, atomic write, mtime conflict. Nutze tempfile und Test-User; niemals echten Vault verändern.

## Docker / Mount
- Ergänze `docker-compose.yml` um einen Mount für `/home/hermes/obsidian` nach z.B. `/app/obsidian`, mit Schreibzugriff für Editieren.
- Konfigurierbarkeit über `OBSIDIAN_ROOT=/app/obsidian` (oder passend benannt) ergänzen; kein hardcodierter Hostpfad im Python-Code.
- Dokumentiere, dass der Mount nicht auf `/app/obsidian/<user>` reduziert werden darf, wenn mehrere User unterstützt werden; Zugriff erfolgt zwingend über authenticated email + containment check.
- Falls serverseitig der Docker-Host den Mount anders bereitstellt, dokumentiere den erwarteten Hostpfad und führe `docker compose config`/Container-Mount-Prüfung durch.
- Keine Kopie des Vaults ins Image.

## Frontend Wissen UX
Ersetze die bisherige Demo-/Placeholder-Logik in `WissenView.tsx`; niemals Beispiel-Ergebnisse bei API-Fehlern anzeigen. Nutze `api.ts`-Wrapper mit auth headers und Fehlerzuständen.

Tabs mindestens:
- `Suche`: Umschalter Volltext / Überschriften, Eingabe, Suche, Ergebnisliste, Treffer-Snippet, Tag-/Pfad-Infos, Öffnen.
- `Navigation`: resizable oder klar geteiltes Layout aus Tree links und Editor rechts. Tree expand/collapse, Ordner/Datei-Icons, aktive Auswahl. Reload.
- `Tags`: Suchfeld, Tag-Chips/Liste mit Counts, ausgewählter Tag zeigt Dokumente, Dokument öffnen.
- `Zuletzt bearbeitet`: Tabelle/Karten mit Dateiname/Pfad, geändert, erstellt; Sortierung geändert/erstellt und Richtung; Öffnen.

Editor:
- etablierte Markdown-Textarea/Editor-Library; Toolbar nur wenn sinnvoll, Preview optional, klare Save-/Dirty-/Conflict-Zustände.
- Save disabled ohne Änderungen, Loading, Erfolg, Fehler, mtime conflict reload action.
- Ctrl/Cmd+S speichern, Escape nur wenn nicht destruktiv.
- Keine XSS: Markdown darf nicht unkontrolliert als HTML injiziert werden. Bei Preview sanitize oder nur Plaintext/Markdown-Text anzeigen.
- Keyboard/focus/aria, responsive: auf Mobile Tree und Editor als klare Umschaltansichten statt unbrauchbarer Mini-Spalten.
- Alle UI-Texte in `i18n.ts` auf Deutsch und Englisch.
- Bestehende Aufgabe-Integration darf WissenView nicht kaputt machen.

## Design
- Bestehende Design-Tokens, `.view`, Tabs, Forms und OpenWebUI-nahe monochrome Bento-Ästhetik wiederverwenden.
- Kein Emoji; ausschließlich Lucide-Icons.
- Suche, Tree, Editor, Tags und Recent sollen als nützliche Arbeitsoberfläche wirken, nicht als Demo.
- Leere Zustände, Loading-Skeleton/Spinner und Error-States ausarbeiten.

## Verifikation
Führe nach jeder finalen Änderung erneut aus:
- `cd frontend && npm run build`
- `python3 -m compileall -q backend`
- relevante Pytest-Tests bzw. gezielte `pytest`-Tests
- `git diff --check`
- `docker compose config`
- Docker-Rebuild mit `sudo -n docker compose up -d --build`
- Container-Mount und Runtime-HTTP prüfen, ohne Vault-Inhalte auszugeben.
- unauthentifizierter Zugriff auf `/api/obsidian/*` muss 401 liefern.
- ad-hoc authentifizierte Tests mit Test-App/Mock-User für Isolation, Search und Save; echte Daten nur lesen, nicht verändern.
- Browser-Tests: Wissen öffnen, alle Tabs, Volltext/Heading-Suche, Tree-Auswahl, Editieren/Speichern mit Testnotiz, Tagsuche, Recent-Sortierung, Fehlerzustände und Konsole. Falls Login nicht möglich ist, klar dokumentieren.
- öffentliche Asset-Bundles nach Upload auf neue Wissen-/Obsidian-Strings prüfen.

## Dokumentation und Skills
- `design.md`: Wissen-Informationsarchitektur, Tabs, Editor, responsive/accessibility.
- `implementation.md` und/oder `README.md`: API-Vertrag, Mount, User-Isolation, Deployment, Backup/Permissions.
- Erweitere `~/.hermes/skills/organaizer-deploy/SKILL.md` um Mount-/Isolation-/Verifikationsregeln.
- Aktualisiere `~/.hermes/skills/obsidian-vault/SKILL.md` mit dem sicheren OrganAIzer-API-/Docker-Workflow; keine echten Vault-Inhalte oder Credentials dokumentieren.

Arbeite autonom und vollständig. Committe nicht. Berichte am Ende nur reale Änderungen und reale Testresultate.

# Auftrag Ende
Bitte starte mit der Code-Inspektion und setze die Implementierung jetzt um.