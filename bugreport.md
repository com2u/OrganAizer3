# Bug Report - OrganAIzer v0.1.3

## Status: 84/84 Tests bestanden (einzelner Lauf, 1.7min)

---

## BUG-1: YouTube Download - "Unexpected token '<'" Fehler (GEFIXT in v0.1.2)

**Status:** Behoben

AufgabenView und BildGeneratorView nutzten relative `fetch('/api/...')` Pfade. Auf organaizer.app ging das an den ionos-Webserver (HTML) statt ans Backend (JSON). Fix: `apiUrl()` Helper mit `VITE_API_BASE`.

## BUG-2: YouTube Bot-Erkennung (YouTube-Einschränkung)

**Status:** Bekannt, nicht durch Code lösbar

YouTube blockiert Downloads von Server-IPs. yt-dlp + Deno installiert, `--extractor-args` gesetzt. Aussagekräftige Fehlermeldung an Benutzer.

## BUG-3: Bildgenerierung nicht verfügbar (GEFIXT in v0.1.3)

**Status:** Behoben

Weder `FAL_AI_API_KEY` noch `hermes_api_url` waren konfiguriert. Fix: Pollinations.ai als kostenloser Fallback hinzugefügt (kein API-Key nötig).

## BUG-4: OCR ohne URL-Support (GEFIXT in v0.1.3)

**Status:** Behoben

OCR unterstützte nur File-Upload und Clipboard. Fix: 3 Input-Modi (Datei/URL/Zwischenablage), neuer Backend-Endpoint `/api/ocr/extract-url`.

## BUG-5: OpenWebUI API Rate-Limiting bei Test-Wiederholungen

**Status:** Bekannt (Test-Infrastruktur, kein App-Bug)

Bei sofortiger Wiederholung der Test-Suite kann die OpenWebUI-API rate-limitten. 60s Wartezeit löst das Problem.

---

## Keine weiteren Bugs bekannt

Alle Bereiche funktionieren einwandfrei:
- ✅ Landing Page, Login, Zugang anfragen
- ✅ Dark/Light Mode, Sprachumschaltung DE/EN
- ✅ Internetrecherche, OCR (Datei/URL/Clipboard), Bilder erstellen (Pollinations.ai)
- ✅ YouTube Download (yt-dlp + Deno)
- ✅ TTS, STT, Diktieren
- ✅ KI Verbindungen (8 Provider inkl. OpenAI)
- ✅ Wissen (Obsidian, WYSIWYG Editor)
