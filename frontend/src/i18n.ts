export type Lang = 'de' | 'en'
export type Theme = 'dark' | 'light'

const THEME_KEY = 'organaizer_theme'
const LANG_KEY = 'organaizer_lang'

export function getStoredTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
}
export function setStoredTheme(t: Theme) {
  localStorage.setItem(THEME_KEY, t)
}
export function getStoredLang(): Lang {
  return (localStorage.getItem(LANG_KEY) as Lang) || 'de'
}
export function setStoredLang(l: Lang) {
  localStorage.setItem(LANG_KEY, l)
}

// Apply theme to document
export function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

type Translations = Record<string, Record<Lang, string>>

const T: Translations = {
  // Nav
  'nav.assistent': { de: 'Assistent', en: 'Assistant' },
  'nav.assistent.hint': { de: 'Hermes Chat', en: 'Hermes Chat' },
  'nav.termine': { de: 'Termine', en: 'Calendar' },
  'nav.termine.hint': { de: 'Terminübersicht', en: 'Schedule overview' },
  'nav.aufgaben': { de: 'Aufgaben', en: 'Tasks' },
  'nav.aufgaben.hint': { de: 'Workflows · Wissen · Bilder', en: 'Workflows · Knowledge · Images' },
  'nav.sprache': { de: 'Sprache', en: 'Speech' },
  'nav.sprache.hint': { de: 'TTS · STT · Downloads', en: 'TTS · STT · Downloads' },
  'nav.wissen': { de: 'Wissen', en: 'Knowledge' },
  'nav.wissen.hint': { de: 'Obsidian-Suche', en: 'Obsidian search' },
  'nav.bilder': { de: 'Bilder', en: 'Images' },
  'nav.bilder.hint': { de: 'KI-Bildgenerator', en: 'AI image generator' },
  'nav.settings': { de: 'Einstellungen', en: 'Settings' },

  // Login
  'login.title': { de: 'Anmelden', en: 'Sign in' },
  'login.hint': { de: 'Mit deinem OpenWebUI-Konto anmelden', en: 'Sign in with your OpenWebUI account' },
  'login.email': { de: 'E-Mail', en: 'Email' },
  'login.password': { de: 'Passwort', en: 'Password' },
  'login.submit': { de: 'Anmelden', en: 'Sign in' },
  'login.submitting': { de: 'Anmelden\u2026', en: 'Signing in\u2026' },
  'login.error': { de: 'Anmeldung fehlgeschlagen', en: 'Login failed' },
  'login.placeholder.email': { de: 'name@beispiel.de', en: 'name@example.com' },

  // Sidebar
  'sidebar.logout': { de: 'Abmelden', en: 'Sign out' },
  'sidebar.loggedIn': { de: 'Angemeldet', en: 'Signed in' },

  // Assistant
  'assistant.workspace': { de: 'ARBEITSBEREICH', en: 'WORKSPACE' },
  'assistant.title': { de: 'Hermes Assistent', en: 'Hermes Assistant' },
  'assistant.sub': { de: 'Dein KI-Arbeitsplatz mit OpenWebUI', en: 'Your AI workspace with OpenWebUI' },
  'assistant.connected': { de: 'Verbunden', en: 'Connected' },
  'assistant.error': { de: 'Fehler', en: 'Error' },
  'assistant.loading': { de: 'OpenWebUI wird geladen\u2026', en: 'Loading OpenWebUI\u2026' },
  'assistant.loadError': { de: 'OpenWebUI konnte nicht geladen werden', en: 'Failed to load OpenWebUI' },
  'assistant.loadErrorHint': { de: 'Pr\u00fcfe die Netzwerkverbindung und ob der OpenWebUI-Server erreichbar ist. Die Konsole zeigt Details.', en: 'Check your network connection and whether the OpenWebUI server is reachable. See console for details.' },
  'assistant.retry': { de: 'Erneut versuchen', en: 'Retry' },
  'assistant.open': { de: 'OpenWebUI \u00f6ffnen', en: 'Open OpenWebUI' },
  'assistant.chat': { de: 'Chat mit Hermes', en: 'Chat with Hermes' },
  'assistant.chatHint': { de: 'Dateien, Bilder und Audio direkt im Chat', en: 'Files, images and audio directly in chat' },

  // Termine
  'termine.title': { de: 'Termine', en: 'Calendar' },
  'termine.sub': { de: 'W\u00f6chentliche Termin\u00fcbersicht', en: 'Weekly schedule overview' },
  'termine.week': { de: 'Woche', en: 'Week' },
  'termine.details': { de: 'Termindetails', en: 'Appointment Details' },
  'termine.number': { de: 'Nummer', en: 'Number' },
  'termine.name': { de: 'Name', en: 'Name' },
  'termine.duration': { de: 'Dauer', en: 'Duration' },
  'termine.interval': { de: 'Intervall', en: 'Interval' },
  'termine.participants': { de: 'Teilnehmer', en: 'Participants' },
  'termine.import': { de: 'Import', en: 'Import' },
  'termine.export': { de: 'Export', en: 'Export' },
  'termine.importing': { de: 'Importiere\u2026', en: 'Importing\u2026' },
  'termine.exporting': { de: 'Exportiere\u2026', en: 'Exporting\u2026' },
  'termine.usergroups': { de: 'Benutzergruppen', en: 'User groups' },
  'termine.meetings': { de: 'Meetings', en: 'Meetings' },
  'termine.filter': { de: 'Filter', en: 'Filter' },
  'termine.highlight': { de: 'Hervorheben', en: 'Highlight' },
  'termine.search': { de: 'Suchen\u2026', en: 'Search\u2026' },

  // Days
  'day.Monday': { de: 'Montag', en: 'Monday' },
  'day.Tuesday': { de: 'Dienstag', en: 'Tuesday' },
  'day.Wednesday': { de: 'Mittwoch', en: 'Wednesday' },
  'day.Thursday': { de: 'Donnerstag', en: 'Thursday' },
  'day.Friday': { de: 'Freitag', en: 'Friday' },
  'day.Saturday': { de: 'Samstag', en: 'Saturday' },
  'day.Sunday': { de: 'Sonntag', en: 'Sunday' },

  // Aufgaben
  'aufgaben.eyebrow': { de: 'DEIN ARBEITSBEREICH', en: 'YOUR WORKSPACE' },
  'aufgaben.title': { de: 'Aufgaben', en: 'Tasks' },
  'aufgaben.sub': { de: 'W\u00e4hle eine Aufgabe, konfiguriere sie und starte direkt.', en: 'Pick a task, configure it and run it directly.' },
  'aufgaben.overview': { de: '\u00dcbersicht', en: 'Overview' },
  'aufgaben.executed': { de: 'Ausgef\u00fchrt', en: 'Executed' },
  'aufgaben.whatToDo': { de: 'Was m\u00f6chtest du erledigen?', en: 'What would you like to do?' },
  'aufgaben.allTools': { de: 'Alle Werkzeuge an einem Ort \u2013 klar gegliedert nach deinem n\u00e4chsten Schritt.', en: 'All tools in one place \u2013 organized by your next step.' },
  'aufgaben.tip': { de: 'Tipp: Starte mit einer Vorlage', en: 'Tip: Start with a template' },
  'aufgaben.quickstart': { de: 'SCHNELLSTART', en: 'QUICK START' },
  'aufgaben.templates': { de: 'Vorlagen f\u00fcr Aufgaben', en: 'Task Templates' },
  'aufgaben.templatesCount': { de: '{n} Vorlagen', en: '{n} templates' },
  'aufgaben.configure': { de: 'Konfigurieren', en: 'Configure' },
  'aufgaben.back': { de: 'Zur\u00fcck zur Aufgaben\u00fcbersicht', en: 'Back to task overview' },
  'aufgaben.backTemplates': { de: 'Zur\u00fcck zu den Vorlagen', en: 'Back to templates' },
  'aufgaben.configuration': { de: 'KONFIGURATION', en: 'CONFIGURATION' },
  'aufgaben.execute': { de: 'Aufgabe ausf\u00fchren', en: 'Execute task' },
  'aufgaben.noExecuted': { de: 'Noch keine Aufgaben ausgef\u00fchrt', en: 'No tasks executed yet' },
  'aufgaben.executedHint': { de: 'Deine abgeschlossenen Workflows erscheinen hier.', en: 'Your completed workflows will appear here.' },
  'aufgaben.task': { de: 'Aufgabe', en: 'Task' },
  'aufgaben.date': { de: 'Datum', en: 'Date' },
  'aufgaben.status': { de: 'Status', en: 'Status' },
  'aufgaben.success': { de: 'Erfolgreich', en: 'Successful' },
  'aufgaben.fillRequired': { de: 'Bitte f\u00fcllen Sie alle Pflichtfelder aus.', en: 'Please fill in all required fields.' },
  'aufgaben.executionSuccess': { de: 'Aufgabe erfolgreich ausgef\u00fchrt!', en: 'Task executed successfully!' },
  'aufgaben.executionError': { de: 'Fehler: Konnte keine Verbindung zum Server herstellen.', en: 'Error: Could not connect to the server.' },

  // Tool cards
  'tool.workflow': { de: 'Aufgaben & Workflows', en: 'Tasks & Workflows' },
  'tool.workflow.desc': { de: 'Planen, wiederholen und mit Vorlagen ausf\u00fchren', en: 'Plan, repeat and execute with templates' },
  'tool.wissen': { de: 'Wissen durchsuchen', en: 'Search Knowledge' },
  'tool.wissen.desc': { de: 'Obsidian-Notizen finden, filtern und kontextualisieren', en: 'Find, filter and contextualize Obsidian notes' },
  'tool.bilder': { de: 'Bilder erstellen', en: 'Create Images' },
  'tool.bilder.desc': { de: 'KI-Bilder beschreiben, konfigurieren und generieren', en: 'Describe, configure and generate AI images' },

  // Templates
  'tpl.newTask': { de: 'Neue Aufgabe erstellen', en: 'Create new task' },
  'tpl.newTask.desc': { de: 'Eine einzelne Aufgabe mit Priorit\u00e4t und F\u00e4lligkeit anlegen', en: 'Create a single task with priority and due date' },
  'tpl.recurring': { de: 'Wiederkehrende Aufgabe', en: 'Recurring task' },
  'tpl.recurring.desc': { de: 'Regelm\u00e4\u00dfige Aufgaben mit einem festen Rhythmus planen', en: 'Plan regular tasks with a fixed schedule' },
  'tpl.review': { de: 'Aufgaben-Review', en: 'Task review' },
  'tpl.review.desc': { de: 'Offene Aufgaben zusammenfassen und n\u00e4chste Schritte erkennen', en: 'Summarize open tasks and identify next steps' },
  'tpl.workflow': { de: 'Workflow starten', en: 'Start workflow' },
  'tpl.workflow.desc': { de: 'Einen mehrstufigen Ablauf f\u00fcr ein konkretes Ziel starten', en: 'Start a multi-step process for a specific goal' },

  // Template fields
  'field.title': { de: 'Titel', en: 'Title' },
  'field.description': { de: 'Beschreibung', en: 'Description' },
  'field.dueDate': { de: 'F\u00e4lligkeitsdatum', en: 'Due date' },
  'field.priority': { de: 'Priorit\u00e4t', en: 'Priority' },
  'field.task': { de: 'Aufgabe', en: 'Task' },
  'field.frequency': { de: 'H\u00e4ufigkeit', en: 'Frequency' },
  'field.startDate': { de: 'Startdatum', en: 'Start date' },
  'field.timeRange': { de: 'Zeitraum', en: 'Time range' },
  'field.workflowType': { de: 'Workflow-Typ', en: 'Workflow type' },
  'field.target': { de: 'Ziel', en: 'Target' },
  'field.notes': { de: 'Notizen', en: 'Notes' },
  'field.select': { de: 'Ausw\u00e4hlen \u2026', en: 'Select \u2026' },
  'field.enter': { de: '{label} eingeben\u2026', en: 'Enter {label}\u2026' },

  // Priority options
  'opt.low': { de: 'Niedrig', en: 'Low' },
  'opt.medium': { de: 'Mittel', en: 'Medium' },
  'opt.high': { de: 'Hoch', en: 'High' },
  // Frequency
  'opt.daily': { de: 'T\u00e4glich', en: 'Daily' },
  'opt.weekly': { de: 'W\u00f6chentlich', en: 'Weekly' },
  'opt.monthly': { de: 'Monatlich', en: 'Monthly' },
  'opt.yearly': { de: 'J\u00e4hrlich', en: 'Yearly' },
  // Time range
  'opt.today': { de: 'Heute', en: 'Today' },
  'opt.thisWeek': { de: 'Diese Woche', en: 'This week' },
  'opt.thisMonth': { de: 'Diesen Monat', en: 'This month' },
  // Status
  'opt.all': { de: 'Alle', en: 'All' },
  'opt.open': { de: 'Offen', en: 'Open' },
  'opt.inProgress': { de: 'In Bearbeitung', en: 'In progress' },
  'opt.done': { de: 'Erledigt', en: 'Done' },
  // Workflow types
  'opt.prReview': { de: 'PR-Review', en: 'PR Review' },
  'opt.codeReview': { de: 'Code-Review', en: 'Code Review' },
  'opt.deployment': { de: 'Deployment', en: 'Deployment' },
  'opt.testing': { de: 'Testing', en: 'Testing' },

  // Category labels
  'cat.planning': { de: 'Planung', en: 'Planning' },
  'cat.analysis': { de: 'Analyse', en: 'Analysis' },
  'cat.workflow': { de: 'Workflow', en: 'Workflow' },

  // Sprache
  'sprache.title': { de: 'Sprache', en: 'Speech' },
  'sprache.sub': { de: 'Text vorlesen \u00b7 Sprache zu Text \u00b7 YouTube Download', en: 'Text to speech \u00b7 Speech to text \u00b7 YouTube Download' },
  'sprache.tts': { de: 'Text vorlesen', en: 'Text to Speech' },
  'sprache.stt': { de: 'Sprache zu Text', en: 'Speech to Text' },
  'sprache.youtube': { de: 'YouTube Download', en: 'YouTube Download' },
  'sprache.tts.title': { de: 'Text vorlesen (Text-to-Speech)', en: 'Text to Speech (TTS)' },
  'sprache.tts.sub': { de: 'Geben Sie Text ein und lassen Sie ihn vorlesen', en: 'Enter text and have it read aloud' },
  'sprache.text': { de: 'Text', en: 'Text' },
  'sprache.tts.placeholder': { de: 'Text eingeben, der vorgelesen werden soll\u2026', en: 'Enter text to be read aloud\u2026' },
  'sprache.voice': { de: 'Stimme', en: 'Voice' },
  'sprache.speed': { de: 'Geschwindigkeit', en: 'Speed' },
  'sprache.generate': { de: 'Text vorlesen', en: 'Read text' },
  'sprache.generating': { de: 'Generiere Audio\u2026', en: 'Generating audio\u2026' },
  'sprache.audioSuccess': { de: 'Audio erfolgreich generiert', en: 'Audio generated successfully' },
  'sprache.downloadAudio': { de: 'Audio herunterladen', en: 'Download audio' },
  'sprache.stt.title': { de: 'Sprache zu Text (Speech-to-Text)', en: 'Speech to Text (STT)' },
  'sprache.stt.sub': { de: 'Laden Sie eine Audio-Datei hoch und transkribieren Sie sie', en: 'Upload an audio file and transcribe it' },
  'sprache.audioFile': { de: 'Audio-Datei', en: 'Audio file' },
  'sprache.transcribe': { de: 'Transkribieren', en: 'Transcribe' },
  'sprache.transcribing': { de: 'Transkribiere\u2026', en: 'Transcribing\u2026' },
  'sprache.transcriptionSuccess': { de: 'Transkription erfolgreich', en: 'Transcription successful' },
  'sprache.yt.title': { de: 'YouTube Download', en: 'YouTube Download' },
  'sprache.yt.sub': { de: 'Laden Sie YouTube-Videos oder -Audio herunter', en: 'Download YouTube videos or audio' },
  'sprache.ytUrl': { de: 'YouTube-URL', en: 'YouTube URL' },
  'sprache.format': { de: 'Format', en: 'Format' },
  'sprache.download': { de: 'Herunterladen', en: 'Download' },
  'sprache.downloading': { de: 'Download l\u00e4uft\u2026', en: 'Downloading\u2026' },
  'sprache.downloadReady': { de: 'Download bereit', en: 'Download ready' },
  'sprache.downloadFile': { de: 'Datei herunterladen', en: 'Download file' },
  'sprache.enterText': { de: 'Bitte geben Sie Text ein.', en: 'Please enter text.' },
  'sprache.selectAudio': { de: 'Bitte w\u00e4hlen Sie eine Audio-Datei aus.', en: 'Please select an audio file.' },
  'sprache.enterUrl': { de: 'Bitte geben Sie eine YouTube-URL ein.', en: 'Please enter a YouTube URL.' },

  // Speed labels
  'speed.slow': { de: 'langsam', en: 'slow' },
  'speed.normal': { de: 'normal', en: 'normal' },
  'speed.fast': { de: 'schnell', en: 'fast' },

  // Format labels
  'format.audio': { de: 'Audio (MP3)', en: 'Audio (MP3)' },
  'format.video': { de: 'Video (MP4)', en: 'Video (MP4)' },

  // Bilder
  'bilder.title': { de: 'Bilder', en: 'Images' },
  'bilder.sub': { de: 'KI-Bildgenerierung mit verschiedenen Stilen', en: 'AI image generation with different styles' },
  'bilder.prompt': { de: 'Prompt', en: 'Prompt' },
  'bilder.promptPlaceholder': { de: 'Beschreiben Sie das gew\u00fcnschte Bild\u2026', en: 'Describe the desired image\u2026' },
  'bilder.improve': { de: 'Prompt verbessern', en: 'Improve prompt' },
  'bilder.negativePrompt': { de: 'Negative Prompt (optional)', en: 'Negative prompt (optional)' },
  'bilder.negPlaceholder': { de: 'Was soll NICHT im Bild sein\u2026', en: 'What should NOT be in the image\u2026' },
  'bilder.style': { de: 'Stil', en: 'Style' },
  'bilder.aspectRatio': { de: 'Seitenverh\u00e4ltnis', en: 'Aspect ratio' },
  'bilder.count': { de: 'Anzahl', en: 'Count' },
  'bilder.quality': { de: 'Qualit\u00e4t', en: 'Quality' },
  'bilder.generate': { de: '{n} Bild{s} generieren', en: 'Generate {n} image{s}' },
  'bilder.generating': { de: 'Generiere\u2026', en: 'Generating\u2026' },
  'bilder.generatingHint': { de: 'Bilder werden generiert\u2026', en: 'Generating images\u2026' },
  'bilder.generatingWait': { de: 'Dies kann einige Sekunden dauern', en: 'This may take a few seconds' },
  'bilder.history': { de: 'Letzte Generationen', en: 'Recent generations' },
  'bilder.empty': { de: 'Geben Sie einen Prompt ein und generieren Sie Ihr erstes KI-Bild', en: 'Enter a prompt and generate your first AI image' },
  'bilder.enterPrompt': { de: 'Bitte geben Sie einen Prompt ein.', en: 'Please enter a prompt.' },
  'bilder.nImages': { de: '{n} Bild', en: '{n} image' },
  'bilder.nImagesPlural': { de: '{n} Bilder', en: '{n} images' },

  // Style labels
  'style.realistic': { de: 'Realistisch', en: 'Realistic' },
  'style.digitalArt': { de: 'Digital Art', en: 'Digital Art' },
  'style.anime': { de: 'Anime', en: 'Anime' },
  'style.3dRender': { de: '3D Render', en: '3D Render' },
  'style.oilPainting': { de: '\u00d6lmalerei', en: 'Oil painting' },
  'style.watercolor': { de: 'Aquarell', en: 'Watercolor' },
  'style.pixelArt': { de: 'Pixel Art', en: 'Pixel Art' },
  'style.minimalist': { de: 'Minimalistisch', en: 'Minimalist' },

  // Aspect ratio
  'ratio.square': { de: 'Quadratisch', en: 'Square' },
  'ratio.wide': { de: 'Breitbild', en: 'Widescreen' },
  'ratio.portrait': { de: 'Hochformat', en: 'Portrait' },
  'ratio.classic': { de: 'Klassisch', en: 'Classic' },
  'ratio.photo': { de: 'Foto', en: 'Photo' },

  // Quality
  'quality.standard': { de: 'Standard', en: 'Standard' },
  'quality.hd': { de: 'HD', en: 'HD' },
  'quality.ultra': { de: 'Ultra', en: 'Ultra' },
  'quality.fast': { de: 'Schnell', en: 'Fast' },
  'quality.high': { de: 'Hohe Qualit\u00e4t', en: 'High quality' },
  'quality.best': { de: 'Beste Qualit\u00e4t', en: 'Best quality' },

  // Wissen
  'wissen.title': { de: 'Wissen', en: 'Knowledge' },
  'wissen.sub': { de: 'Obsidian Knowledge Base durchsuchen', en: 'Search Obsidian Knowledge Base' },
  'wissen.search': { de: 'Suche', en: 'Search' },
  'wissen.recent': { de: 'Zuletzt bearbeitet', en: 'Recently edited' },
  'wissen.tags': { de: 'Tags', en: 'Tags' },
  'wissen.searchTerm': { de: 'Suchbegriff', en: 'Search term' },
  'wissen.searchPlaceholder': { de: 'Begriff eingeben\u2026', en: 'Enter term\u2026' },
  'wissen.tag': { de: 'Tag', en: 'Tag' },
  'wissen.path': { de: 'Pfad', en: 'Path' },
  'wissen.date': { de: 'Datum', en: 'Date' },
  'wissen.searchBtn': { de: 'Wissen durchsuchen', en: 'Search knowledge' },
  'wissen.searching': { de: 'Suche\u2026', en: 'Searching\u2026' },
  'wissen.results': { de: '{n} Ergebnisse', en: '{n} results' },
  'wissen.noRecent': { de: 'Keine k\u00fcrzlich bearbeiteten Notizen', en: 'No recently edited notes' },
  'wissen.recentHint': { de: 'Hier werden Notizen angezeigt, die k\u00fcrzlich bearbeitet wurden.', en: 'Recently edited notes will appear here.' },
  'wissen.noTags': { de: 'Keine Tags verf\u00fcgbar', en: 'No tags available' },
  'wissen.tagsHint': { de: 'Tags werden automatisch aus der Obsidian-Datenbank extrahiert.', en: 'Tags are automatically extracted from the Obsidian database.' },

  // Config / Settings
  'config.title': { de: 'Einstellungen', en: 'Settings' },
  'config.sub': { de: 'Systemkonfiguration f\u00fcr OrganAIzer', en: 'System configuration for OrganAIzer' },
  'config.save': { de: 'Speichern', en: 'Save' },
  'config.saving': { de: 'Speichern\u2026', en: 'Saving\u2026' },
  'config.saved': { de: 'Gespeichert!', en: 'Saved!' },
  'config.loading': { de: 'Lade Konfiguration\u2026', en: 'Loading configuration\u2026' },
  'config.saveError': { de: 'Fehler beim Speichern der Konfiguration', en: 'Error saving configuration' },
  'config.general': { de: 'Allgemein', en: 'General' },
  'config.tts': { de: 'Text vorlesen', en: 'Text to Speech' },
  'config.youtube': { de: 'YouTube', en: 'YouTube' },
  'config.bilder': { de: 'Bilder', en: 'Images' },
  'config.ocr': { de: 'OCR', en: 'OCR' },
  'config.obsidian': { de: 'Obsidian', en: 'Obsidian' },
  'config.appearance': { de: 'Darstellung', en: 'Appearance' },

  // General settings
  'config.general.title': { de: 'Allgemeine Einstellungen', en: 'General Settings' },
  'config.hermesApi': { de: 'API URL', en: 'API URL' },

  // Appearance
  'config.theme': { de: 'Erscheinungsbild', en: 'Theme' },
  'config.theme.dark': { de: 'Dunkel', en: 'Dark' },
  'config.theme.light': { de: 'Hell', en: 'Light' },
  'config.language': { de: 'Sprache', en: 'Language' },
  'config.lang.de': { de: 'Deutsch', en: 'Deutsch' },
  'config.lang.en': { de: 'English', en: 'English' },

  // TTS settings
  'config.tts.title': { de: 'Text vorlesen (TTS)', en: 'Text to Speech (TTS)' },
  'config.autoPlay': { de: 'Auto-Wiedergabe', en: 'Auto-play' },
  'config.autoPlay.desc': { de: 'Audio automatisch abspielen nach der Generierung', en: 'Automatically play audio after generation' },
  'config.autoDownload': { de: 'Auto-Download', en: 'Auto-download' },
  'config.autoDownload.desc': { de: 'Audio automatisch herunterladen', en: 'Automatically download audio' },

  // YouTube settings
  'config.yt.title': { de: 'YouTube Download', en: 'YouTube Download' },
  'config.defaultFormat': { de: 'Standard-Format', en: 'Default format' },
  'config.defaultQuality': { de: 'Standard-Qualit\u00e4t', en: 'Default quality' },
  'config.quality.low': { de: 'Niedrig (schnell)', en: 'Low (fast)' },
  'config.quality.medium': { de: 'Mittel', en: 'Medium' },
  'config.quality.high': { de: 'Hoch (langsam)', en: 'High (slow)' },

  // Bilder settings
  'config.bilder.title': { de: 'Bilder generieren', en: 'Generate images' },
  'config.autoShow': { de: 'Auto-Anzeige', en: 'Auto-show' },
  'config.autoShow.desc': { de: 'Generierte Bilder automatisch anzeigen', en: 'Automatically show generated images' },
  'config.autoDownloadImg': { de: 'Auto-Download', en: 'Auto-download' },
  'config.autoDownloadImg.desc': { de: 'Bilder automatisch herunterladen', en: 'Automatically download images' },
  'config.defaultStyle': { de: 'Standard-Style', en: 'Default style' },

  // OCR settings
  'config.ocr.title': { de: 'OCR (Text aus Bildern)', en: 'OCR (Text from images)' },
  'config.autoExtract': { de: 'Auto-Extraktion', en: 'Auto-extract' },
  'config.autoExtract.desc': { de: 'Text automatisch aus Bildern extrahieren', en: 'Automatically extract text from images' },
  'config.defaultLang': { de: 'Standard-Sprache', en: 'Default language' },

  // Obsidian settings
  'config.obsidian.title': { de: 'Obsidian Knowledge Base', en: 'Obsidian Knowledge Base' },
  'config.vaultPath': { de: 'Vault-Pfad', en: 'Vault path' },
  'config.apiUrl': { de: 'API URL', en: 'API URL' },
  'config.obsidian.info': { de: 'Die Obsidian-Integration wird sp\u00e4ter aktiviert. Die Oberfl\u00e4che ist vorbereitet.', en: 'The Obsidian integration will be activated later. The interface is prepared.' },

  // Config save button
  'config.saveSettings': { de: 'Einstellungen speichern', en: 'Save settings' },

  // Misc
  'loading': { de: 'Laden\u2026', en: 'Loading\u2026' },

  // Logging Panel
  'config.logs': { de: 'Protokoll', en: 'Logs' },
  'config.logs.title': { de: 'System-Protokoll', en: 'System Logs' },
  'config.logs.desc': { de: 'Frontend- und Backend-Protokolleinträge mit sicherer Schwärzung sensibler Daten.', en: 'Frontend and backend log entries with safe redaction of sensitive data.' },
  'logs.frontend': { de: 'Frontend', en: 'Frontend' },
  'logs.backend': { de: 'Backend', en: 'Backend' },
  'logs.all': { de: 'Alle', en: 'All' },
  'logs.errors': { de: 'Fehler', en: 'Errors' },
  'logs.warnings': { de: 'Warnungen', en: 'Warnings' },
  'logs.info': { de: 'Info', en: 'Info' },
  'logs.debug': { de: 'Debug', en: 'Debug' },
  'logs.refresh': { de: 'Aktualisieren', en: 'Refresh' },
  'logs.export': { de: 'Exportieren', en: 'Export' },
  'logs.clear': { de: 'Löschen', en: 'Clear' },
  'logs.autoscroll': { de: 'Auto-Scroll', en: 'Auto-scroll' },
  'logs.noEntries': { de: 'Keine Protokolleinträge vorhanden', en: 'No log entries available' },
  'logs.time': { de: 'Zeit', en: 'Time' },
  'logs.level': { de: 'Level', en: 'Level' },
  'logs.source': { de: 'Quelle', en: 'Source' },
  'logs.message': { de: 'Nachricht', en: 'Message' },
  'logs.method': { de: 'Methode', en: 'Method' },
  'logs.path': { de: 'Pfad', en: 'Path' },
  'logs.status': { de: 'Status', en: 'Status' },
  'logs.duration': { de: 'Dauer', en: 'Duration' },
  'logs.user': { de: 'Benutzer', en: 'User' },
}

export function t(key: string, lang: Lang): string {
  return T[key]?.[lang] ?? key
}
