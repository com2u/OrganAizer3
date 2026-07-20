# OpenCode Auftrag: Wissen-Bereich UI/UX-Verbesserungen

Arbeite im Repository `/home/hermes/OrganAIzer` als Senior Full-Stack-Engineer und UI/UX-Experte. Setze die folgenden UI/UX-Verbesserungen im Wissen-Bereich (WissenView) vollständig um.

## Aktueller Stand
- `frontend/src/components/WissenView.tsx` wurde bereits umgeschrieben (626 Zeilen)
- Enthält NoteEditor mit MDEditor (@uiw/react-md-editor) - aber Bug: Tree-Klick öffnet nicht den Editor
- TreeNodeItem hat `useState(false)` - alle Ordner eingeklappt ✓
- RecentTab hat keine "Öffnen"-Button mehr ✓
- Die Tabelle hat aber noch Probleme mit Layout und Klick-Verhalten

## Aufgabe 1: Navigation Tree - Bug beheben
**Datei:** `frontend/src/components/WissenView.tsx`

Das Problem: Wenn man auf eine Datei im Tree klickt, öffnet sich der Editor nicht.

Ursache: Der Tree-Click-Handler in TreeNodeItem ruft `onSelect(node.path)` auf, aber in der NavigationTab-Komponente wird `selectedPath` gesetzt und der Editor angezeigt. Der Bug liegt wahrscheinlich darin, dass der Tree nur die Root-Level-Items zeigt, aber nicht die korrekten Pfade übergibt.

Lösungsansatz:
1. Prüfe die Tree-Struktur: Der Root-Node hat `name: ""` und children. Die children werden auf depth=0 gerendert.
2. Stelle sicher, dass der `handleSelect` Callback korrekt aufgerufen wird
3. Prüfe ob `selectedPath` korrekt gesetzt wird und der Editor angezeigt wird
4. Stelle sicher, dass der `nav-editor-pane` nicht versteckt ist

## Aufgabe 2: Tabelle "Zuletzt bearbeitet" modernisieren
**Datei:** `frontend/src/components/WissenView.tsx` + `frontend/src/styles/app.css`

### Aktueller Stand der RecentTab:
- Hat eine leere `<th></th>` Spalte die die Lücke erzeugt
- Hat eine "Öffnen"-Button-Spalte die entfernt werden soll
- Die Zeilen sollen klickbar sein

### Änderungen:
1. Entferne die leere `<th></th>` Spalte (Zeile ~531 im Code)
2. Entferne die "Öffnen"-Button-Spalte (Zeile ~540-544)
3. Mache die gesamte `<tr>` Zeile klickbar: `onClick={() => onOpenNote(n.path)}`
4. Füge `cursor: pointer` und hover-Effekt hinzu
5. Modernisiere das Layout:
   - Entferne weiße Lücke zwischen Pfad und Geändert
   - Mache die Tabellenzeilen interaktiv
   - Slightly rounded corners auf Zeilen
   - Bessere hover-States
   - Stelle sicher, dass die Zeitstempel-Texte nicht umbrechen

### CSS-Änderungen:
```css
.recent-table tr.recent-row { cursor: pointer; }
.recent-table tr.recent-row:hover td { 
  background: var(--bg-hover); 
  border-radius: var(--radius-sm); 
}
```

## Aufgabe 3: Markdown Editor korrigieren
**Datei:** `frontend/src/components/WissenView.tsx`

Der MDEditor muss korrekt funktionieren:
1. Stelle sicher, dass `@uiw/react-md-editor` installiert ist und importiert wird
2. Der Editor soll Split-View anzeigen (Editor links + Preview rechts)
3. Stelle sicher, dass der Editor die gesamte Höhe des Containers einnimmt
4. Prüfe die CSS-Klasse `.note-md-editor` und stelle sicher, dass sie korrekt funktioniert
5. Prüfe ob der Editor bei der Navigation-Tab korrekt angezeigt wird

### Wichtig: CSS für den Editor
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
```

## Aufgabe 4: Alle Editor-Nutzungen prüfen
**Datei:** `frontend/src/components/WissenView.tsx`

Der neue Editor soll an ALLEN Stellen verwendet werden, wo Markdown-Dateien editiert oder betrachtet werden:
1. NavigationTab: NoteEditor Component
2. FloatingEditor: NoteEditor Component
3. SearchTab: Ergebnisse sollen den neuen Editor nutzen
4. TagsTab: Dateien sollen den neuen Editor nutzen

## Aufgabe 5: Navigation zurück zur Übersicht
**Datei:** `frontend/src/components/WissenView.tsx`

- Klick auf "Wissen" in der Sidebar → Zurück zur Übersicht
- Klick auf Tab-Buttons → Wechselt korrekt zwischen Tabs

## Design-Richtlinien
- Bestehende Design-Tokens (CSS Variablen) verwenden
- Lucide-Icons beibehalten
- Dark/Light Theme Kompatibilität beibehalten
- Kein Emoji
- Responsive Design beachten

## i18n (Deutsch/Englisch)
- Füge neue Übersetzungen in `frontend/src/i18n.ts` hinzu
- Keys für neuen Markdown Editor, Tabelle, etc.

## Dateien die geändert werden MÜSSEN:
1. `frontend/src/components/WissenView.tsx` - Hauptänderungen
2. `frontend/src/styles/app.css` - CSS-Updates
3. `frontend/src/i18n.ts` - neue Übersetzungen

## Verifikation
Nach allen Änderungen:
1. `cd frontend && npm install`
2. `cd frontend && npm run build`
3. Prüfe TypeScript Fehler: `cd frontend && npx tsc --noEmit`

## WICHTIG
- Committe nicht
- Ändere nur die notwendigen Dateien
- Behalte bestehende Funktionalität bei
- Teste den Build erfolgreich
- Arbeite autonom und vollständig
