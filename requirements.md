# OrganAIzer – Produktidee und Anforderungen

## 1. Zielbild

OrganAIzer ist ein persönlicher, KI-gestützter Arbeitsbereich für Kommunikation,
Wissen, Medien, Ressourcen und Terminplanung. Der in die Anwendung integrierte
Assistent heißt **Hermes**. Er soll Informationen nicht nur beantworten,
sondern – abhängig von den eingerichteten Verbindungen – auch in Kalendern,
E-Mails, Wissensbeständen und externen Diensten recherchieren und daraus
nachvollziehbare Arbeitsergebnisse erzeugen.

Die Anwendung verbindet folgende Grundideen:

- Ein zentraler Chat für Fragen und Arbeitsaufträge an Hermes.
- Kalender, Aufgaben und Ressourcen als strukturierte Arbeitsdaten.
- Sprache, Webdialog und Telefonie als gleichwertige Zugänge zum Assistenten.
- Eine persönliche Wissensbasis mit optionalen spezialisierten Werkzeugen.
- Regelbasierte, KI-unterstützte Planung mit prüfbaren Excel-Ergebnissen.
- Lokal konfigurierbare externe Verbindungen und austauschbare KI-Modelle.
- Persistente Daten, die bei Updates und Container-Deployments erhalten bleiben.

Alle fachlichen Bereiche sollen in einer einheitlichen, responsiven Oberfläche
mit hellem und dunklem Farbschema bedienbar sein. Listen- und Tabellenobjekte
werden grundsätzlich per Doppelklick oder über einen zugänglichen
Bearbeiten-Knopf in einem einheitlichen, blickdichten modalen Dialog geöffnet.

## 2. Hermes-Chat

### Zweck

Der Chat ist der allgemeine Zugang zu Hermes. Er dient für Fragen, Analysen,
Zusammenfassungen und Arbeitsaufträge, die keinem spezielleren Bereich
zugeordnet werden müssen.

### Grundbedienung und Anforderungen

- Benutzer geben ihre Anfrage als Text ein und erhalten eine nachvollziehbare
  Antwort im Gesprächsverlauf.
- Fragt ein Benutzer nach Terminen, Kalendereinträgen, E-Mails oder vergleichbaren
  externen Informationen, verwendet der Assistent die eingerichteten
  Hermes-Funktionen statt Inhalte zu erfinden.
- Der Webassistent und der Telefonassistent sollen fachlich denselben
  Assistenten und dieselben freigegebenen Funktionen nutzen können.
- Fehler externer Dienste müssen verständlich angezeigt werden und dürfen den
  restlichen Arbeitsbereich nicht blockieren.

## 3. Termine und Wochenkalender

### Zweck

Der Bereich Termine visualisiert die geplanten Besprechungen und bildet die
zentrale Terminlandschaft ab. Er unterstützt die operative Prüfung einzelner
Kalenderwochen und ist zugleich Ein- und Ausgabepunkt für Excel-Daten.

### Grundbedienung

- Benutzer wählen eine Kalenderwoche und sehen Montag bis Sonntag auf der
  X-Achse sowie eine Zeitleiste auf der Y-Achse.
- Jeder Termin zeigt mindestens Nummer, Beginn, Ende und Bezeichnung.
- Ein Doppelklick öffnet alle Details: Nummer, Name, Woche, Wochentag, Beginn,
  Ende, Dauer, Intervall und Teilnehmer.
- Termine können nach Personengruppe oder Meeting gefiltert beziehungsweise
  farblich hervorgehoben werden.

### Daten- und Importanforderungen

- Die ursprüngliche CLI muss `schedule.xlsx` in die Datenbank importieren und
  die vorhandenen Tabellen vor einem vollständigen Import leeren.
- Import und Export müssen über CLI und Weboberfläche verfügbar sein.
- Der Export erzeugt eine Excel-Datei im gleichen Tabellenblattformat; jedes
  Arbeitsblatt wird als Tabelle ausgegeben.
- Aus dem redundanten Blatt `Terminliste` werden nur Woche, Tag, Start und
  Meeting gespeichert. Ende, Name, Intervall, Dauer und Teilnehmer werden aus
  den normalisierten Tabellen abgeleitet.
- Import und Export protokollieren jeden Schritt ausführlich und liefern
  insbesondere bei Fehlern konkrete Diagnosen.
- Ein ersetzender Import überschreibt vorhandene Daten nur nach einer
  ausdrücklichen Warnung im Frontend und einem verpflichtenden
  Bestätigungsparameter im Backend.
- Vor dem Überschreiben werden fehlende, unbekannte oder widersprüchliche
  Referenzen aufgelistet. Der Benutzer kann ausdrücklich fortfahren oder den
  Import abbrechen.

## 4. Aufgaben

### Zweck

Aufgaben bündeln wiederkehrende, spezialisierte KI- und Medienabläufe. Ein
Template stellt die benötigten Eingaben bereit, zeigt den Bearbeitungsstatus
und macht das Ergebnis anschließend direkt nutzbar oder herunterladbar.

### Internetrecherche

- Der Benutzer beschreibt Thema, Fragestellung und gewünschte Tiefe.
- Hermes recherchiert serverseitig und stellt ein strukturiertes Ergebnis mit
  Quellen bereit.
- Länger laufende Recherchen werden asynchron verarbeitet. Oberfläche und API
  zeigen verstrichene Zeit und verfügbare Bearbeitungsphasen, statt mit einem
  Browser-Timeout oder `Failed to fetch` abzubrechen.
- Das Ergebnis kann als Markdown-Datei heruntergeladen werden.

### Bilder erstellen

- Der Benutzer beschreibt Motiv, Stil und gewünschtes Ausgabeformat.
- Das konfigurierte Bildmodell erzeugt ein Ergebnis, das in der Oberfläche
  betrachtet und gespeichert werden kann.
- Generierungsfehler werden verständlich angezeigt; ein erneuter Versuch darf
  ohne Verlust der Eingaben möglich sein.

### YouTube-Download

- Der Benutzer übergibt eine unterstützte YouTube-Adresse.
- Der serverseitige Prozess lädt das angeforderte Medium beziehungsweise die
  angebotene Ausgabe herunter und stellt das Ergebnis bereit.
- Fortschritt, Fehler und nicht unterstützte Inhalte werden sichtbar
  kommuniziert.

### Texterkennung

- Bilder oder Dokumente können für OCR hochgeladen werden.
- Die Texterkennung unterstützt die installierten Sprachmodelle und gibt den
  erkannten Text zur weiteren Bearbeitung oder zum Download aus.
- Upload, Verarbeitung und Fehlerbehandlung erfolgen serverseitig, ohne lokale
  Dateipfade offenzulegen.

### n8n

- Ist eine aktive, konfigurierte n8n-Verbindung vorhanden, erscheint ein
  eigener Aufgaben-Reiter mit der eingebetteten n8n-Oberfläche.
- Ohne eingerichtete Verbindung bleibt der Reiter verborgen.

## 5. Sprache

### Vorlesen

- Text kann auf Deutsch und Englisch synthetisiert und direkt abgespielt werden.
- Aufnahme beziehungsweise Generierung zeigt einen verständlichen Status und
  einen sichtbaren Pegel.
- Das erzeugte Audio muss über den Play-Knopf zuverlässig abspielbar sein.

### Sprache zu Text / Diktieren

- Nach einer ausdrücklichen Benutzeraktion wird Mikrofonzugriff angefordert.
- Die Oberfläche erklärt die Berechtigungsanfrage und zeigt den Aufnahmezustand
  einschließlich Pegel an.
- Gesprochene Sprache wird transkribiert und als editierbarer Text verfügbar.

### Dialog

- Der authentifizierte Dialogbereich baut eine Echtzeit-Audiositzung mit
  demselben Assistenten auf, der Telefonate führt.
- Browser erhalten ausschließlich einen öffentlich erreichbaren,
  verschlüsselten `wss://`-LiveKit-Endpunkt; serverlokale `localhost`-Adressen
  dürfen nicht an entfernte Browser ausgegeben werden.
- Browserdialog und SIP-Telefonie sind unabhängige Transportwege. Änderungen an
  einem Weg dürfen den anderen nicht unterbrechen.
- Verbindungsversuche enden nach einer definierten Zeit, zeigen einen
  verständlichen Fehler und visualisieren eine erfolgreiche
  LiveKit-Wiederverbindung.
- Das Mikrofon startet nur nach ausdrücklicher Benutzeraktion.

## 6. Wissen

### Obsidian-Wissensdatenbank

- Die vorhandene Obsidian-Wissensbasis ist der primäre persönliche
  Markdown-Wissensspeicher.
- Benutzer navigieren durch Ordner und Dateien, öffnen und bearbeiten Notizen
  und speichern Änderungen persistent.
- Wissen kann im Volltext durchsucht und nach den angebotenen Kriterien
  sortiert werden.
- Tags und zuletzt bearbeitete Inhalte unterstützen den schnellen Zugriff.
- Markdown-Darstellung und Editor unterscheiden korrekt zwischen hellem und
  dunklem Farbschema.

### Recherche-Notebooks mit Open Notebook

- Eine eingerichtete Open-Notebook-Verbindung ergänzt Wissen um den Reiter
  `Recherche-Notebooks`, ohne den Obsidian-Arbeitsablauf zu ersetzen.
- Die responsive deutsche und englische Oberfläche zeigt Bereitschaft,
  Notebook-Liste und Notebook-Anlage sowie Lade-, Leer-, Offline- und
  Fehlerzustände.
- Das vollständige Open-Notebook-Studio ist eingebettet. Sammlungen, Quellen,
  Recherche, Notizen, Transformationen und Podcasts müssen innerhalb von
  OrganAIzer nutzbar sein.
- Zugangsdaten und interne Dienstadressen verbleiben im Backend.
  OrganAIzer-Endpunkte sind authentifiziert.
- Open Notebook und SurrealDB speichern ihre Daten persistent unter `data/`;
  Backend-Uploads überschreiben keine Recherche-Inhalte.
- Das vollständige Studio wird nur über eine ausdrücklich konfigurierte
  HTTPS-Adresse freigeschaltet.

### Präsentationen mit Slidev

- Benutzer erstellen, wählen, aktivieren und löschen mehrere Präsentationen.
- Jede Präsentation besitzt eine eigene Markdown-Datei sowie einen navigierbaren,
  persistenten Ordnerbaum.
- Ordner sowie Bilder, Hintergründe, Videos, Audio, Fonts, PDFs und weitere
  Medien können hinzugefügt oder gelöscht werden.
- Eine Datei darf maximal 100 MB groß sein. Der API-Reverse-Proxy akzeptiert
  Anfragen bis 110 MB, das Backend erzwingt die fachliche 100-MB-Grenze.
- Pfadmanipulationen werden abgewiesen. Aktives Projekt, `slides.md` und der
  öffentliche Medien-Stammordner sind gegen versehentliches Löschen geschützt.
- Der Arbeitsbereich bietet Markdown-Bearbeitung mit Live-Vorschau,
  Publikumspräsentation, native Slidev-Sprecheransicht, erneutes Verbinden und
  Browser-Vollbild. Präsentationen können außerdem in einem separaten
  Browserfenster geöffnet werden.
- Ein Projektwechsel startet nur den isolierten Slidev-Prozess neu; OrganAIzer,
  Telefonie und andere Arbeitsbereiche bleiben verfügbar.
- Die bisherige Einzelpräsentation wird verlustfrei in die Projektstruktur
  übernommen.

### HyperFrames

- Eine konfigurierte HyperFrames-Verbindung ergänzt Wissen um einen eigenen
  eingebetteten Studio-Reiter mit Vollbildfunktion.
- HyperFrames läuft in einem separaten Node-22-Container mit Chromium und
  FFmpeg.
- Projekte, Assets und Renderausgaben bleiben in
  `data/hyperframes/projects`, `data/hyperframes/assets` und
  `data/hyperframes/output` persistent.
- Das Startprojekt verwendet die OrganAIzer-Designtokens und muss den
  HyperFrames-Lint ohne Fehler bestehen.

### Whiteboards mit Excalidraw

- Eine aktivierte und vollständig konfigurierte Excalidraw-Verbindung ergänzt
  Wissen um den Reiter **Whiteboard**.
- Die vollständige selbst gehostete Excalidraw-Oberfläche wird in einem
  geschützten iFrame eingebettet und bietet freie Zeichenfläche, Formen, Text,
  Bilder, Bibliotheken, Hell-/Dunkelmodus und Vollbild.
- Zeichnungen sind local-first im Browser gespeichert. Benutzer können sie als
  `.excalidraw`, PNG oder SVG sichern und wieder laden.
- Vor dem Einbetten prüft OrganAIzer den Containerstatus. Ein erneutes
  Verbinden ist ohne Neuladen der Gesamtanwendung möglich.

## 7. Ressourcen

### Zweck

Ressourcen bilden alle Entitäten ab, die für Terminverwaltung und Planung
benötigt werden.

### Gruppen und Personen

- Gruppen bündeln Teilnehmer für Termine, Rollen und Planungsregeln.
- Personen enthalten ihre Stammdaten und ein durchsuchbares Standortfeld.
- Zuordnungen können über verständliche Auswahl- beziehungsweise
  Drag-and-drop-Oberflächen gepflegt werden.

### Rollen

- Rollen beschreiben Funktionen oder Verantwortlichkeiten.
- Einer Rolle können validiert einzelne Personen oder ganze Gruppen zugeordnet
  werden.
- Die Zuordnungsoberfläche folgt derselben Logik wie die
  Teilnehmerzuordnung eines Termins.

### Termine

- Terminressourcen enthalten Stammdaten, Dauer, Intervall und
  Planungsinformationen.
- Persistierte Gruppen werden beim Öffnen geladen und können per Drag-and-drop
  oder Klick als Teilnehmer hinzugefügt beziehungsweise entfernt werden.
- Teilnehmeränderungen werden validiert und in `termin_teilnehmer`
  gespeichert.
- Termine unterstützen ebenfalls validierte Zuordnungen zu Räumen und
  Komponenten.

### Räume und Komponenten

- Räume repräsentieren buchbare Orte beziehungsweise Kapazitäten.
- Komponenten repräsentieren weitere für einen Termin benötigte Mittel.
- Zuordnungen müssen logisch, referenziell konsistent und über Import/Export
  vollständig verfügbar sein.

### Einheitliche Bearbeitung

- Gruppen, Personen, Rollen, Termine, Räume, Komponenten, Planungsregeln und
  Telefonbuchkontakte verwenden denselben modalen Bearbeitungsstil.
- Doppelklick öffnet den Editor; sichtbare Bearbeiten-Knöpfe bleiben für
  Barrierefreiheit erhalten.
- Excel-Import und -Export erhalten alle Ressourcen und Zuordnungen in eigenen
  Tabellenblättern.

## 8. Planung

### Regeln

- Regeln beschreiben allgemeine Zeitfenster, Pausen, feste Termine,
  Abhängigkeiten, Ressourcenverfügbarkeiten und weitere
  Planungsbedingungen.
- Regeln werden automatisch nummeriert und sind in der Oberfläche editierbar.
- Das Bedingungsfeld ist der zentrale, entsprechend große Eingabebereich.
- Alle aktiven Regeln sind beim Planen standardmäßig ausgewählt.
  Detailregeln bleiben zunächst eingeklappt und können anschließend einzeln
  abgewählt werden.
- Regeln sind als eigenes Tabellenblatt Bestandteil des Excel-Imports und
  -Exports.

### Validierung

- Die Validierung verwendet OpenRouter und ein vom Benutzer über eine
  durchsuchbare Modellliste gewähltes Textmodell.
- Sie prüft Regeln, Meetings, Intervalle, Dauer, Teilnehmer, Ressourcen und
  feste Termine auf Widersprüche oder Unklarheiten.
- Abweichungen und nicht erfüllbare Bedingungen erscheinen gesammelt in einem
  modalen Dialog.

### Planungslauf

- OpenRouter erhält die ausgewählten Regeln und alle notwendigen
  Ressourcendaten.
- Lange Planungen laufen asynchron und zeigen verstrichene Zeit,
  Bearbeitungsphasen sowie verfügbare Zwischenergebnisse.
- Die KI liefert strukturierte Terminvorschläge und meldet ungelöste Konflikte,
  Unklarheiten oder Widersprüche, statt sie stillschweigend zu ignorieren.
- Das Ergebnis ist eine herunterladbare Excel-Arbeitsmappe, die mit dem
  vorhandenen Termin-Import-/Exportformat kompatibel ist.
- Der Benutzer prüft die Datei zunächst und kann sie anschließend als neuen,
  nach Sicherheitsabfrage vollständig ersetzenden Terminvorschlag importieren.

## 9. Telefonie

### Telefonassistent

- Der Sprachassistent nimmt SIP-Telefonate entgegen und führt ein natürliches
  Gespräch mit denselben freigegebenen Hermes-Funktionen wie der Webdialog.
- Zu Beginn jedes Anrufs erhält er aktuelle Uhrzeit, Datum und Wochentag als
  Kontext.
- Die erste Begrüßung soll schnell erfolgen; Audiotransport und
  Sprachverarbeitung müssen stabil und ohne abgehackte Ausgaben arbeiten.
- Am Gesprächsende wird zur Rufnummer eine Notiz angelegt oder ergänzt. Sie
  enthält Datum und Uhrzeit des letzten Anrufs sowie eine kurze
  Gesprächszusammenfassung.
- Telefonie- und Browserdialog bleiben technisch voneinander unabhängig.

### Telefonate

- Die Anrufhistorie zeigt eingehende und ausgehende Gespräche mit den
  verfügbaren Metadaten und Zusammenfassungen.
- Einzelne Einträge können nach einer Sicherheitsabfrage gelöscht werden.

### Telefonbuch

- Das Telefonbuch ist ein eigener Reiter in Telefonie.
- Kontakte speichern Telefonnummer, Name, E-Mail-Adresse und beliebig
  ergänzbare Notizen.
- Die E-Mail-Adresse kann für nachgelagerte Nachrichtenfunktionen verwendet
  werden.
- Doppelklick oder Bearbeiten öffnet einen einheitlichen modalen Dialog.
- Das Notizfeld ist als großer, vertikal vergrößerbarer Haupttextbereich
  ausgeführt.
- Telefonbuch, Anrufhistorie und Notizen werden persistent gespeichert,
  gesichert und bei Deployments nicht überschrieben.

## 10. Externe Verbindungen

### Zweck und Bedienung

Externe Verbindungen schalten optionale Dienste frei. Der Benutzer fügt eine
Verbindungs-Kachel hinzu, öffnet `Konfigurieren`, hinterlegt die erforderlichen
lokalen Einstellungen und aktiviert die Verbindung. Ein zugehöriger Reiter
erscheint erst, wenn die Verbindung vorhanden und vollständig konfiguriert ist.

### Vorgesehene Integrationen

- Microsoft Office sowie Outlook für Kalender, E-Mail, Kontakte und Aufgaben.
- Google für Kalender, Gmail, Kontakte und Aufgaben.
- OneNote, SharePoint und OneDrive.
- Jira und Confluence.
- SAP und Interflex.
- n8n für Workflow-Automatisierung.
- Open Notebook für Recherche-Notebooks und das vollständige Studio.
- Slidev für Präsentationsprojekte.
- HyperFrames für HTML-basierte Videoerstellung und Rendering.
- Excalidraw für Diagramme, Skizzen und visuelle Whiteboards.
- MCP-basierte Erweiterungen.

### Sicherheits- und Persistenzanforderungen

- Integrationsdaten werden lokal und persistent unter `data/integrations/`
  gespeichert, von Git und Upload-Synchronisation ausgeschlossen und mit
  restriktiven Dateirechten geschützt.
- Secrets und interne Adressen werden von Konfigurations-APIs nicht an das
  Frontend zurückgegeben.
- Backend-Uploads erhalten Integrationskonfigurationen, Projekte und
  Inhaltsdaten.
- Open-Notebook-, n8n-, Slidev-, HyperFrames- und Excalidraw-Reiter sind nur nach aktiver,
  vollständiger Konfiguration sichtbar.
- Slidev, HyperFrames und Excalidraw verwenden automatisch ausgestellte, signierte,
  kurzlebige Tickets und HttpOnly-partitionierte Cookies. Im Browser wird kein
  zusätzliches Passwort angezeigt oder in die iframe-Adresse eingebettet.
- Integrations- und Telefonbuchdialoge verwenden dieselbe blickdichte,
  themenfähige Ressourcen-Modaloberfläche mit einheitlichen Abständen,
  Schatten und Hintergrund.

## 11. KI-Verbindungen

### Zweck

KI-Verbindungen trennen fachliche Funktionen von einem fest eingebauten
Modellanbieter. Administratoren können Anbieter, Modell, Basis-URL, Region,
Endpoint und Secret-Referenz pflegen und Verbindungen aktivieren oder
deaktivieren.

### Anforderungen

- Text- und Planungsmodelle sind austauschbar konfigurierbar.
- OpenRouter dient als Modellzugang für Validierung und Terminplanung und
  stellt eine durchsuchbare Modellauswahl bereit.
- Bild-, Sprach-, Recherche- und weitere KI-Funktionen verwenden die jeweils
  konfigurierte geeignete Verbindung.
- Secrets verbleiben serverseitig und dürfen weder in Logs noch in
  Frontend-Antworten erscheinen.

## 12. System und Betrieb

- `System` ist ein Tab innerhalb der Einstellungen.
- Authentifizierte Benutzer sehen CPU- und RAM-Auslastung des Backend-Servers
  sowie den Zustand der Docker-Container: gestartet, gestoppt oder fehlerhaft.
- `./start.sh` startet die Anwendung lokal beziehungsweise entsprechend der
  dokumentierten Umgebung.
- Backend und optionale Dienste laufen in Docker Compose.
- Persistente Datenverzeichnisse sind vom Quellcode-Upload getrennt.
- Die Datenbankschicht ist über ein Interface gekapselt. Die ursprüngliche
  SQLite-Implementierung war austauschbar ausgelegt; der produktive Betrieb
  verwendet Supabase/PostgreSQL mit migrierten Daten, Tabellen und
  Zugriffsrechten.
- Implementierungsarchitektur und Modulbeziehungen werden in
  `architecture.md` beziehungsweise der historisch geforderten
  `implementation.md` dokumentiert.
- README und Requirements werden mit jeder fachlichen Erweiterung aktualisiert.

## 13. Qualitätssicherung

Automatisierte Tests müssen Kernfunktionen prüfen und bei einem Fehler klar
fehlschlagen. Eine Änderung gilt erst als abgeschlossen, wenn die betroffenen
Funktionen implementiert und in angemessenem Umfang verifiziert wurden.

Mindestens abzudecken sind:

- Vollständiger Excel-Import und -Export.
- Kalenderansicht für Woche 1, Woche 2 und Woche 3.
- Filter für Meeting 1 sowie Benutzergruppen C2 und F2.
- Detailansicht eines Termins.
- Referenzprüfung und Bestätigung beim ersetzenden Import.
- Ressourcen- und Teilnehmerzuordnungen.
- Regelvalidierung und Planungsergebnis.
- Web-Sprachdialog und unabhängige SIP-Telefonie.
- Löschen von Telefonaten und Bearbeiten von Telefonbuchkontakten.
- Open-Notebook-, Slidev-, HyperFrames-, Excalidraw- und n8n-Integrationszustände.
- Slidev-Projekte, Ordner, Medien, Publikums- und Sprecheransicht.

## 14. Historische Kernanforderungen

Die folgenden Architekturziele bleiben auch nach der Weiterentwicklung
verbindlich:

1. Die Anwendung verwaltet planungsfähige Termine mit einer Python-CLI und
   einer Datenbank.
2. Die ursprüngliche Excel-Struktur aus `schedule.xlsx` bleibt importier- und
   exportierbar.
3. Die Persistenzschicht bleibt austauschbar und fachliche Logik darf nicht
   unnötig an einen konkreten Datenbanktreiber gekoppelt werden.
4. Das React-Frontend und der Python-Webserver bilden gemeinsam die
   Webanwendung.
5. `.gitignore`, README, Requirements und Architekturdokumentation bleiben
   Bestandteil des Projekts.
