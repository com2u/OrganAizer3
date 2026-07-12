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
]

# Tables in reverse dependency order for safe deletion
CLEAR_ORDER = [
    "terminliste",
    "termin_teilnehmer",
    "termine",
    "intervalle",
    "usergruppen",
    "bereiche",
]
