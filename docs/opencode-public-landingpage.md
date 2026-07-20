# OpenCode Auftrag: Öffentliche OrganAIzer-Projektwebseite vor dem Login

## Rolle
Du bist Senior Product Designer, UX-Engineer und Marketing-orientierter React/TypeScript-Entwickler. Arbeite direkt im Repository `/home/hermes/OrganAIzer`. Implementiere eine produktionsreife öffentliche Landingpage, die nicht authentifizierten Besuchern vor dem Login angezeigt wird. Nutze bestehende UI, Design-Tokens und Architektur; keine komplette Neuentwicklung und keine erfundenen Backend-Features.

## Ziel
Die aktuelle öffentliche Startseite zeigt ausschließlich ein kleines Login-Formular. Ersetze diesen Einstieg durch eine überzeugende, ruhige, professionelle Produktseite für OrganAIzer mit klarer Erklärung, Produktnutzen, echten UI-Darstellungen aus dem Produkt und gut sichtbaren CTAs für Anmelden und Interesse/Registrierung.

Primäre Oberfläche: Decide/Learn. Sekundär: Configure/Auth. Die Landingpage darf einen Hero haben, aber nicht als generische SaaS-Seite wirken. Komposition: editorialer Split-Hero mit Produktpreview, danach ungleichgewichtige Bento-Story mit Produktmodulen, Workflow und CTA.

## Kontext und Constraints
- Bestehendes Design steht in `design.md` und `frontend/src/styles/app.css`.
- Stil: OpenWebUI-inspiriert, monochrom, ruhig, präzise, Dark/Light-Theme, Inter/System-Fallback, Lucide-Icons.
- Bestehende Authentifizierung läuft über `POST /api/auth/login` gegen OpenWebUI.
- Selbstregistrierung ist laut README aktuell absichtlich deaktiviert; keine falsche lokale Account-Erstellung vortäuschen.
- Für "Registrieren / Interesse" einen ehrlichen Flow bauen: bevorzugt Link/CTA zu einer passenden OpenWebUI-Registrierungs-/Kontaktmöglichkeit, sofern im Projekt konfigurierbar; andernfalls ein Interest-Modal/Formular mit klarer Copy und ohne Fake-Success. Keine neue Persistenz oder Route erfinden, wenn Backend nicht dafür ausgelegt ist.
- Keine Secrets, Token oder Zugangsdaten in Frontend, API, Logs oder Dokumentation.
- Bestehende uncommitted Änderungen nicht überschreiben; nur notwendige Dateien ändern.
- Alle sichtbaren Texte über das bestehende i18n-System in Deutsch und Englisch.
- Keine externen Stockbilder oder unsichere CDN-Abhängigkeiten.

## Vor dem Ändern prüfen
1. Lies `design.md`, `README.md`, `implementation.md`.
2. Lies `frontend/src/App.tsx`, `LoginScreen.tsx`, `ThemeContext.tsx`, `i18n.ts`, `api.ts`, `types.ts`, `styles/app.css`.
3. Suche nach vorhandenen Produktkomponenten und echten UI-Mustern (Kalender, Aufgaben, Assistent, KI-Verbindungen, Ressourcen, Planung, Sprache).
4. Prüfe Package-Manifest und vorhandene lucide-react-Icons.
5. Prüfe, ob backendseitig ein sicherer öffentlicher Info-/Interest-Endpunkt existiert. Nur falls sinnvoll und sicher ergänzen.

## Produktbotschaft
OrganAIzer ist ein persönlicher AI Workspace, der Termine, Aufgaben, Wissen, Sprache, Ressourcen, Planung, Telefonie und mehrere KI-Verbindungen in einer ruhigen Arbeitsoberfläche bündelt. Keine übertriebenen Claims, keine erfundenen Nutzerzahlen, keine Fake-Testimonials und keine unbestätigten Integrationen.

## Umsetzungsanforderungen
### 1. Public entry state
- In `App.tsx`: Wenn keine Session vorhanden ist, öffentliche Landingpage rendern; Login bleibt als eigener Zustand/Modal/Ansicht erreichbar.
- Login-CTA öffnet eine fokussierte Login-Ansicht mit bestehender Funktionalität und klarer "Zurück zur Projektseite"-Navigation.
- Direkte Interaktionen müssen bei Refresh funktionieren; kein Router-Zwang, wenn state-basiert im Projekt üblich ist.
- Authenticated users dürfen unverändert direkt in die App gelangen.

### 2. Landingpage-Struktur
- Sticky/compact Header mit OrganAIzer-Branding, optional Theme-/Language-Control falls im bestehenden Muster möglich, Login als sekundärer CTA und primärer CTA "Interesse zeigen" oder "Registrieren".
- Hero: präziser Eyebrow, starke deutsch/englische Headline, kurze Nutzenbeschreibung, zwei CTAs, Vertrauens-/Produktzeile ohne erfundene Zahlen.
- Hero-Produktpreview: echte, codebasierte Produktdarstellung aus vorhandenen Modulen, keine externen Screenshots. Zeige eine realistische OrganAIzer-App-Shell mit Sidebar und reduzierten, aber echten Inhaltsmustern (z.B. Kalender/Assistent/KI-Verbindungen). Markiere klar als Vorschau.
- Bento-Story: mehrere unterschiedlich gewichtete Zellen, nicht drei identische Feature-Karten. Module: Termine & Planung, Aufgaben & Ressourcen, KI-Verbindungen, Sprache/Wissen. Jede Zelle hat eine konkrete Erklärung und passende Lucide-Icons bzw. UI-Fragmente.
- Workflow-Sektion: drei bis vier Schritte von Sammeln über Strukturieren bis Handeln, mit sichtbarer Verbindung zur tatsächlichen App.
- Feature-/Prinzipien-Sektion: Fokus auf weniger Kontextwechsel, private/provider-neutrale Verbindungen, einheitliche Arbeitsoberfläche. Nur belegbare Aussagen.
- Abschluss-CTA mit Login und Interesse/Registrierung.
- Footer mit Produktname, Hinweis auf bestehende Authentifizierung/OpenWebUI falls relevant, Theme/Language-Kontext und keine toten Links.

### 3. Interest/Register UX
- Der CTA muss verständlich zwischen "Anmelden" und "Interesse zeigen / Zugang anfragen" unterscheiden.
- Da Selbstregistrierung aktuell deaktiviert ist: ehrliche Beschriftung wie "Zugang anfragen" und erklärender Text. Wenn ein funktionierender OpenWebUI-Registrierungslink aus Konfiguration sicher ableitbar ist, nutze ihn; sonst Modal mit Kontakt-/Hinweis und vorhandener Zieladresse, ohne behaupteten Versand.
- Niemals Formulardaten an nicht vorhandene API senden. Wenn ein Backend-Endpunkt ergänzt wird, implementiere Validierung, Rate-Limit/Spam-Basisschutz, Auth-freie öffentliche Route, keine sensiblen Daten und Tests.
- Keyboard, Escape, Focus und Screenreader-Verhalten sauber.

### 4. Motion
- Sparsame, sinnvolle Animationen: initiale Staggered-Reveal, hover/focus elevation, subtile Produktpreview-Bewegung.
- Nutze moderne CSS-Funktionen nur mit robustem Fallback, z.B. `@supports (view-transition-name: ...)` und `document.startViewTransition` nur optional; keine Navigation darf davon abhängen.
- `prefers-reduced-motion: reduce` vollständig respektieren.
- Keine permanenten, ablenkenden Loops.

### 5. Responsive und Accessibility
- Mobile-first, 320px bis große Desktop-Breiten.
- Keine horizontale Überbreite; Hero wird auf Mobile gestapelt, Bento-Grid auf eine Spalte.
- Touch-Ziele mindestens 44px.
- Semantische Sections, Heading-Hierarchie, sichtbare Focus States, kontrastreiche CTAs, aria-labels für icon-only controls.
- Theme dark/light und DE/EN müssen vollständig funktionieren.

### 6. Screenshots / Produktdarstellung
- Keine binären Fake-Screenshot-Dateien nötig: bevorzuge wartbare, responsive React-Produktpreview-Komponenten, die wie echte Screenshots wirken und vorhandene UI-Design-Tokens verwenden.
- Falls echte Screenshots als Assets erstellt werden, nur aus lokaler App/Demo, dokumentiere Quelle und reduziere alle personenbezogenen Daten.
- Die Preview muss klar als Produktdarstellung erkennbar sein und darf keine falschen Live-Daten suggerieren.

### 7. Backend
- Ändere Backend nur, wenn der Interest/Register-Flow es wirklich benötigt.
- Öffentliche Info-Endpunkte dürfen keine Konfiguration, Userdaten oder Secrets leaken.
- Auth-Schutz für alle bestehenden API-Routen erhalten.
- Falls Backend geändert: gezielte Tests, `compileall`, API-Status-/Redaction-Checks.

## Dateien und Dokumentation
- Erstelle/ändere passende React-Komponenten statt eine monolithische Login-Datei zu überladen.
- Ergänze `design.md` um Landingpage-Komposition, Preview-Regeln, Motion und Public/Auth-Zustände.
- Ergänze `implementation.md` und/oder `README.md` um Public entry, Auth- und Interest-Flow.
- Erstelle keine Secrets.

## Verifikation (selbstständig durchführen)
1. `npm run build` im Frontend.
2. `python3 -m compileall -q backend` falls Backend berührt.
3. `git diff --check`.
4. Bei vorhandenem Browser: lokale/public Landingpage öffnen, Screenshot auf Desktop und schmaler Breite prüfen, Login CTA öffnen, zurück navigieren, Theme/Language testen, Browserkonsole prüfen.
5. Prüfe öffentliche Landingpage ohne Auth; geschützte API bleibt ohne Token 401.
6. Prüfe, dass authentifizierter Flow und bestehende Login-Submission nicht kaputt sind.
7. Behebe gefundene TypeScript-, Layout-, Accessibility- und Interaktionsprobleme und führe die relevanten Checks nach jeder finalen Änderung erneut aus.
8. Gib am Ende konkrete geänderte Dateien und reale Testausgaben zusammengefasst aus. Nicht behaupten, etwas getestet zu haben, wenn es nicht ausgeführt wurde.

## Qualitätsbar
Die Seite soll sich wie der hochwertige Einstieg in das bestehende OrganAIzer-Produkt anfühlen: ruhig, nicht werblich überladen, präzise in der Copy, visuell mit der App verbunden, auf Mobile brauchbar, mit klarer Login-Fortsetzung und einem ehrlichen Zugang-anfragen-Flow.

Arbeite die Aufgabe vollständig autonom ab. Committe nicht und überschreibe keine fremden Änderungen.

## OpenCode-Nachlauf
Nach der ersten Implementierung prüfe die eigene Seite kritisch auf generische SaaS-Muster, zu viele gleichartige Karten, erfundene Claims, schlechte mobile Hierarchie und fehlende Auth-Klarheit. Iteriere direkt im Code, bis die Qualitätsbar erfüllt ist.

### Explizite Screenshots
Erzeuge, wenn Browser-/Screenshot-Infrastruktur verfügbar ist, Desktop- und Mobile-Screenshots der Landingpage zur visuellen Prüfung. Speichere sie nur außerhalb des Repositories oder in dokumentierten, unkritischen `docs/`-Assets; niemals Credentials oder private Live-Daten aufnehmen.

### Ergebnisbericht
Melde:
- Dateien geändert
- public/login/register flow
- Tests/builds
- verbleibende Einschränkungen
- Screenshot-Pfade, falls erstellt
- ob Backend geändert wurde und warum

Arbeite jetzt im Repository und setze die Anforderungen um.


# Auftrag Ende

Bitte lies diesen Auftrag und führe ihn vollständig aus. Wenn eine Annahme nötig ist, wähle die sicherste, ehrliche Lösung und dokumentiere sie.