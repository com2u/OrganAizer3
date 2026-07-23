"""SQL table definitions for the Terminlandschaft database."""

# Table creation statements in dependency order
CREATE_TABLES = [
    """
    CREATE TABLE IF NOT EXISTS bereiche (
        gruppe TEXT PRIMARY KEY,
        bereich TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS usergruppen (
        nummer TEXT PRIMARY KEY,
        bereich TEXT NOT NULL REFERENCES bereiche(gruppe),
        bezeichnung TEXT NOT NULL,
        name TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS intervalle (
        kuerzel TEXT PRIMARY KEY,
        bedeutung TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS termine (
        bespr_nr INTEGER PRIMARY KEY,
        bezeichnung TEXT NOT NULL,
        intervall TEXT NOT NULL REFERENCES intervalle(kuerzel),
        dauer_min INTEGER NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS termin_teilnehmer (
        bespr_nr INTEGER NOT NULL REFERENCES termine(bespr_nr),
        usergruppe TEXT NOT NULL,
        PRIMARY KEY (bespr_nr, usergruppe)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS terminliste (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        woche INTEGER NOT NULL,
        tag TEXT NOT NULL,
        start TEXT NOT NULL,
        meeting INTEGER NOT NULL REFERENCES termine(bespr_nr)
    )
    """,
    # ===== Telephony tables =====
    """
    CREATE TABLE IF NOT EXISTS sip_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        mode TEXT NOT NULL DEFAULT 'disabled',
        sip_server TEXT NOT NULL DEFAULT '',
        sip_port INTEGER NOT NULL DEFAULT 5060,
        sip_username TEXT NOT NULL DEFAULT '',
        sip_password_hash TEXT NOT NULL DEFAULT '',
        sip_transport TEXT NOT NULL DEFAULT 'wss',
        stun_server TEXT NOT NULL DEFAULT '',
        webhook_url TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        direction TEXT NOT NULL DEFAULT 'outbound',
        remote_number TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'initiated',
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at TEXT,
        duration_seconds INTEGER,
        summary TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS call_dialog_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        call_id INTEGER NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'ok'
    )
    """,
    # ===== Resource Management tables =====
    # personen: extends usergruppen concept with additional personal data
    # NOTE: usergruppen already represents persons/groups. personen adds
    # structured personal data (email, phone) linked via usergruppe FK.
    """
    CREATE TABLE IF NOT EXISTS personen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vorname TEXT NOT NULL,
        nachname TEXT NOT NULL,
        email TEXT,
        telefon TEXT,
        usergruppe TEXT REFERENCES usergruppen(nummer),
        aktiv INTEGER NOT NULL DEFAULT 1,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS rollen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bezeichnung TEXT NOT NULL UNIQUE,
        beschreibung TEXT,
        farbe TEXT DEFAULT '#71717a',
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS person_rollen (
        person_id INTEGER NOT NULL REFERENCES personen(id) ON DELETE CASCADE,
        rolle_id INTEGER NOT NULL REFERENCES rollen(id) ON DELETE CASCADE,
        PRIMARY KEY (person_id, rolle_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS raeume (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bezeichnung TEXT NOT NULL,
        gebaeude TEXT,
        kapazitaet INTEGER DEFAULT 0,
        ausstattung TEXT,
        aktiv INTEGER NOT NULL DEFAULT 1,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS komponenten (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bezeichnung TEXT NOT NULL,
        typ TEXT,
        beschreibung TEXT,
        verfuegbar INTEGER NOT NULL DEFAULT 1,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    # ===== Planning tables =====
    """
    CREATE TABLE IF NOT EXISTS planungsregeln (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bezeichnung TEXT NOT NULL,
        typ TEXT NOT NULL DEFAULT 'constraint',
        bedingung TEXT NOT NULL,
        prioritaet INTEGER NOT NULL DEFAULT 5,
        aktiv INTEGER NOT NULL DEFAULT 1,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS planungsauftraege (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bezeichnung TEXT,
        woche_von INTEGER NOT NULL,
        woche_bis INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'entwurf',
        ergebnis_json TEXT,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS planungsauftrag_regeln (
        auftrag_id INTEGER NOT NULL REFERENCES planungsauftraege(id) ON DELETE CASCADE,
        regel_id INTEGER NOT NULL REFERENCES planungsregeln(id) ON DELETE CASCADE,
        PRIMARY KEY (auftrag_id, regel_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS hermes_jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        phase TEXT NOT NULL,
        result TEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    # ===== AI Connections table =====
    """
    CREATE TABLE IF NOT EXISTS ki_verbindungen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        provider TEXT NOT NULL CHECK(provider IN ('ollama','llama_cpp','bedrock','copilot','claude','gemini','openrouter')),
        kategorie TEXT NOT NULL CHECK(kategorie IN ('lokal','eigen','cloud')),
        model_name TEXT,
        base_url TEXT,
        region TEXT,
        endpoint TEXT,
        secret_ref TEXT,
        aktiv INTEGER NOT NULL DEFAULT 1,
        metadata_json TEXT,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    # ===== Integration Connections (Verbindungen) =====
    """
    CREATE TABLE IF NOT EXISTS verbindungen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_key TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'prepared',
        beschreibung TEXT,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS planungsregel_abhaengigkeiten (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        regel_id INTEGER NOT NULL REFERENCES planungsregeln(id) ON DELETE CASCADE,
        typ TEXT NOT NULL DEFAULT 'requires',
        ziel_typ TEXT NOT NULL,
        ziel_id INTEGER,
        ziel_text TEXT,
        bedingung TEXT,
        aktiv INTEGER NOT NULL DEFAULT 1,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    # ===== Access Requests (public, no auth) =====
    # Stores "Zugang anfragen" submissions from the landing page.
    # No password/token/secret fields. IP is NOT stored persistently.
    # Duplicate emails are handled at the route level (neutral re-confirmation).
    """
    CREATE TABLE IF NOT EXISTS zugangsanfragen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        zusatzinfos TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_zugangsanfragen_open_email
    ON zugangsanfragen(email) WHERE status = 'open'
    """,
    # ===== n8n Integration =====
    # Stores the connection settings for the local n8n instance.
    # Only one row (singleton, id = 1) is expected.
    """
    CREATE TABLE IF NOT EXISTS n8n_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        base_url TEXT NOT NULL DEFAULT 'http://localhost:5678',
        api_key TEXT,
        webhook_url TEXT,
        aktiv INTEGER NOT NULL DEFAULT 1,
        erstellt_am TEXT NOT NULL DEFAULT (datetime('now')),
        aktualisiert_am TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
]

# Tables in reverse dependency order for safe deletion
CLEAR_ORDER = [
    "hermes_jobs",
    "n8n_config",
    "zugangsanfragen",
    "verbindungen",
    "ki_verbindungen",
    "planungsregel_abhaengigkeiten",
    "planungsauftrag_regeln",
    "planungsauftraege",
    "planungsregeln",
    "komponenten",
    "raeume",
    "person_rollen",
    "rollen",
    "personen",
    "call_dialog_entries",
    "calls",
    "sip_config",
    "terminliste",
    "termin_teilnehmer",
    "termine",
    "intervalle",
    "usergruppen",
    "bereiche",
]
