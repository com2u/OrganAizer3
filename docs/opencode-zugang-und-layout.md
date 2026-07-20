# OpenCode-Auftrag: Verbindungen-Layout und Zugang-anfragen

Arbeitsverzeichnis: `/home/hermes/OrganAIzer`

## Ziel

Implementiere vollständig und produktionsreif zwei zusammenhängende Verbesserungen für OrganAIzer:

1. Das Layout der eingeloggten Ansichten „Verbindungen“ und „KI-Verbindungen“ soll sich beim Seitenkopf und bei den Außenabständen an den übrigen Ansichten (Ressourcen, Planung, Aufgaben, Sprache, Wissen) orientieren. Die vorhandenen Bento-Karten im Inhaltsbereich sollen erhalten bleiben.
2. Auf der öffentlichen Startseite soll „Zugang anfragen“ ein echtes, validiertes Anfrageformular öffnen und die Anfrage sicher im Backend entgegennehmen und persistent speichern.

## Wichtige Randbedingungen

- Bestehende uncommitted Änderungen gehören zum Projekt und müssen erhalten bleiben. Keine Commits, kein Push, keine History-Rewrites.
- Nutze die vorhandenen React/TypeScript-, Flask-, SQLite-, i18n- und `apiFetch`-Konventionen. Keine neue UI-Bibliothek ohne Notwendigkeit.
- Keine Secrets, Passwörter, API-Keys, Tokens oder Zugangsdaten lesen, ausgeben oder speichern.
- Die Zugangsanfrage ist keine automatische Registrierung und darf keinen Zugang vortäuschen. Sie speichert eine Anfrage und zeigt eine ehrliche Bestätigung.
- Öffentliche Anfrage-Route muss bewusst ohne Login erreichbar sein; alle anderen API-Routen bleiben geschützt.
- Eingaben serverseitig validieren, normalisieren und begrenzen. E-Mail syntaktisch plausibel prüfen; Zusatzinformationen begrenzen. Keine HTML-Ausgabe, keine SQL-String-Interpolation.
- Rate-Limit/Spam-Schutz im Rahmen der vorhandenen Architektur berücksichtigen, mindestens einfache IP-/Zeitfenster- oder vergleichbare Schutzlogik ohne dauerhafte Secrets. Keine unkontrollierte E-Mail-Zustellung implementieren.
- Datenschutz: nur notwendige Felder speichern (E-Mail, Zusatzinformationen, Zeitstempel, Status); keine IP dauerhaft speichern, wenn nicht erforderlich. Duplicate-Anfragen sinnvoll behandeln.
- API-Fehler konsistent als JSON, UI mit Loading-, Fehler-, Erfolg- und Accessibility-Zuständen. Dialog/Formular per Escape und Tastatur bedienbar.
- Keine Fake-Erfolgsmeldung bei Serverfehler.

## Layout-Anforderungen

- Prüfe zuerst die bestehenden gemeinsamen Container-/Header-Klassen und die konkreten Views.
- „Verbindungen“: Überschrift und Untertitel dürfen nicht vom Hinzufügen-Button verdeckt werden. Der Kopf muss ausreichend Raum für Text und Aktionen reservieren; bei schmalen Breiten sauber umbrechen, Button nicht über Text legen.
- „Verbindungen“ soll links einen schmalen, sichtbaren Abstand zur Sidebar behalten; Bento-Grid und Inhalt dürfen nicht direkt an die Navigation stoßen.
- „KI-Verbindungen“ soll denselben Seitenkopf-/Container-Rhythmus und denselben linken Rand wie Ressourcen, Planung, Aufgaben, Sprache und Wissen verwenden. Bento-Inhalt bleibt erlaubt.
- Responsiv für Desktop, Tablet und Mobile; keine horizontale Überbreite. Dark/Light-Theme und bestehende CSS-Variablen verwenden.
- Überschrift, Untertitel und Aktionen sollen in beiden Verbindungsseiten klar vollständig sichtbar sein. Gemeinsame wiederverwendbare Layout-Klasse bevorzugen statt page-spezifischer Hacks.

## Zugang-anfragen-Funktion

- Bestehende `InterestModal`-Platzhalterfunktion auf der Landingpage durch echtes Formular ersetzen oder sauber erweitern.
- Felder mindestens: E-Mail-Adresse (Pflichtfeld) und Zusatzinformationen/Nachricht (Pflichtfeld oder sinnvoll validiert, max. Länge klar kommunizieren).
- Deutsche und englische i18n-Texte für Labels, Platzhalter, Validierungsfehler, Loading, Serverfehler und Erfolg ergänzen.
- Frontend-API-Funktion ausschließlich über den zentralen `apiFetch`-Mechanismus erweitern; für die öffentliche Route muss der Client den Auth-Header nicht benötigen, ohne die zentrale Architektur zu umgehen.
- Backend: neue öffentliche Route unter einem klaren Pfad, z. B. `/api/access-requests` oder `/api/auth/access-request`; genaue Wahl an bestehende Struktur anpassen. Blueprint-Auth-Ausnahme gezielt und dokumentiert umsetzen.
- SQLite-Tabelle idempotent bei App-Start anlegen. Sinnvolle Felder: id, email, zusatzinformationen, status (z. B. `open`), erstellt_am, aktualisiert_am. Keine Passwort-/Token-/Secret-Felder.
- POST-Vertrag dokumentieren. Erfolgreiche Antwort enthält nur neutrale Bestätigung und ggf. Anfrage-ID; keine internen Daten leaken.
- Duplicate-Mail-Anfragen nicht zu unnötigem Spam führen; entweder vorhandene offene Anfrage neutral bestätigen oder sauber validiert ablehnen. Verhalten dokumentieren.

## Dokumentation

Aktualisiere passende Projektdokumentation (mindestens `implementation.md`, ggf. `design.md`) mit Layout-Konventionen, API-Vertrag, Datenmodell, Datenschutz- und Auth-Grenzen. Keine Secrets in Dokumentation.

## Tests und Verifikation

- Bestehende Tests nicht brechen; wenn sinnvoll fokussierte Backend-Tests für Validierung, öffentliche Route, Duplicate-Verhalten und Auth-Schutz ergänzen.
- Vor Abschluss selbst ausführen: Frontend-Produktionsbuild, Python-Kompilierung, `git diff --check`, vorhandene Pytests.
- Zusätzlich eine gezielte Ad-hoc-Prüfung in einem temporären OS-sicheren `/tmp/hermes-verify-*`-Skript ausführen: Layout-Klassen/Texte, Formular/API-Vertrag, öffentliche Route, Auth-Schutz für andere Routen, idempotentes Schema, keine Secret-Felder.
- Beschreibe exakt, welche Dateien geändert und welche Checks ausgeführt wurden.

Arbeite direkt im Repository, implementiere alle notwendigen Änderungen und hinterlasse keine Commit-/Push-Aktion. Wenn eine vorhandene Struktur von diesen Beispielen abweicht, folge dem tatsächlichen Code und dokumentiere die Entscheidung.

Am Ende: kurze Zusammenfassung, Tests/Build-Ausgaben und verbleibende Risiken. Keine erfundenen Ergebnisse.

## Nachgelagerte Schritte durch Hermes

Nach deiner Arbeit wird Hermes die Änderungen unabhängig prüfen, den Docker-Stack neu bauen, die geschützten und öffentlichen Routen per Runtime prüfen, die öffentliche Domain prüfen und das Frontend über `upload_frontend.sh` hochladen. Do not deploy or commit from OpenCode unless explicitly instructed; focus on source changes and local verification.

ENDE DES AUFTRAGS
