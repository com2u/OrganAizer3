# OrganAIzer Frontend Test Suite - Übersicht

## Version: 0.1.3 | 84 Tests, alle bestanden (1.7min)

## Test-Framework
- **Playwright** mit Chromium (headless)
- Konfiguration: `frontend/playwright.config.ts`
- Test-Ordner: `frontend/tests/`

## Befehle
```bash
cd frontend && npm test              # Alle 84 Tests
cd frontend && npm run test:headed   # Mit Browser-Fenster
cd frontend && npm run test:report   # HTML-Report
```

## Test-Suites (17 Dateien, 84 Tests)

| # | Datei | Tests | Bereich | Status |
|---|-------|-------|---------|--------|
| 01 | 01-landing-page.spec.ts | 7 | Landing Page | ✅ |
| 02 | 02-login.spec.ts | 6 | Login (serial) | ✅ |
| 03 | 03-zugang-anfragen.spec.ts | 4 | Zugang anfragen | ✅ |
| 04 | 04-theme.spec.ts | 4 | Dark/Light Mode | ✅ |
| 05 | 05-language.spec.ts | 3 | Sprachumschaltung DE/EN | ✅ |
| 06 | 06-aufgaben-recherche.spec.ts | 8 | Internetrecherche | ✅ |
| 07 | 07-aufgaben-ocr.spec.ts | 6 | OCR Texterkennung | ✅ |
| 08 | 08-aufgaben-youtube.spec.ts | 6 | YouTube Download | ✅ |
| 09 | 09-aufgaben-bilder.spec.ts | 10 | Bilder erstellen | ✅ |
| 10 | 10-sprache-tts.spec.ts | 6 | Text vorlesen (TTS) | ✅ |
| 11 | 11-sprache-stt.spec.ts | 5 | Sprache zu Text (STT) | ✅ |
| 12 | 12-sprache-diktieren.spec.ts | 6 | Diktieren | ✅ |
| 13 | 13-ocr-url.spec.ts | 7 | OCR mit URL | ✅ |
| 14 | 14-theme-auth.spec.ts | 1 | Theme in App | ✅ |
| 15 | 15-language-auth.spec.ts | 1 | Sprache in App | ✅ |
| 16 | 16-bilder-generate.spec.ts | 2 | Bildgenerierung Pipeline | ✅ |
| | **Total** | **84** | | **84 PASS** |
