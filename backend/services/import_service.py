"""Import service: reads an Excel file and populates the database."""

import logging
from typing import Any

import openpyxl

from backend.db.interface import DatabaseInterface

logger = logging.getLogger(__name__)

# Missing interval codes found in Termine but absent from the Intervalle sheet
EXTRA_INTERVALS = {
    "2M": "Alle 2 Monate",
    "W6": "Alle 6 Wochen",
}


def import_excel(db: DatabaseInterface, filepath: str) -> None:
    """Import all sheets from the Excel file into the database.

    Clears existing data first, then imports in FK-safe order.
    """
    logger.info("Starting import from %s", filepath)
    wb = openpyxl.load_workbook(filepath, read_only=True)

    try:
        db.clear_tables()
        _import_bereiche(db, wb["Bereiche"])
        _import_usergruppen(db, wb["Usergruppen"])
        _import_intervalle(db, wb["Intervalle"])
        _import_termine(db, wb["Termine"])
        _import_terminliste(db, wb["Terminliste"])
    finally:
        wb.close()

    logger.info("Import completed successfully")


def _import_bereiche(db: DatabaseInterface, ws: Any) -> None:
    """Import the Bereiche (departments) sheet."""
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    data = [(r[0], r[1]) for r in rows if r[0] is not None]
    db.executemany("INSERT INTO bereiche (gruppe, bereich) VALUES (?, ?)", data)
    logger.info("Imported %d bereiche", len(data))


def _import_usergruppen(db: DatabaseInterface, ws: Any) -> None:
    """Import the Usergruppen (user groups) sheet."""
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    data = []
    for r in rows:
        if r[0] is None or r[1] is None:
            continue
        bereich = str(r[0]).strip()
        nummer = str(r[1]).strip()
        bezeichnung = str(r[2]).strip() if r[2] else ""
        name = str(r[3]).strip() if r[3] else None
        data.append((nummer, bereich, bezeichnung, name))
    db.executemany(
        "INSERT INTO usergruppen (nummer, bereich, bezeichnung, name) VALUES (?, ?, ?, ?)",
        data,
    )
    logger.info("Imported %d usergruppen", len(data))


def _import_intervalle(db: DatabaseInterface, ws: Any) -> None:
    """Import the Intervalle sheet plus any missing interval codes."""
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    data = []
    seen = set()
    for r in rows:
        if r[0] is None:
            continue
        kuerzel = str(r[0]).strip()
        bedeutung = str(r[1]).strip() if r[1] else ""
        data.append((kuerzel, bedeutung))
        seen.add(kuerzel)

    # Add missing intervals discovered during planning
    for k, v in EXTRA_INTERVALS.items():
        if k not in seen:
            data.append((k, v))
            logger.debug("Added missing interval: %s = %s", k, v)

    db.executemany("INSERT INTO intervalle (kuerzel, bedeutung) VALUES (?, ?)", data)
    logger.info("Imported %d intervalle", len(data))


def _import_termine(db: DatabaseInterface, ws: Any) -> None:
    """Import the Termine (meetings) sheet and participant junction table."""
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    termine_data = []
    teilnehmer_data = []

    for r in rows:
        if r[0] is None:
            continue
        bespr_nr = int(r[0])
        bezeichnung = str(r[1]).strip() if r[1] else ""
        intervall = str(r[2]).strip() if r[2] else ""
        dauer_min = int(r[3]) if r[3] else 0
        termine_data.append((bespr_nr, bezeichnung, intervall, dauer_min))

        # Columns E onwards (index 4+) are participant codes
        seen_codes = set()
        for col_idx in range(4, len(r)):
            val = r[col_idx]
            if val is not None:
                code = str(val).strip()
                if code and code not in seen_codes:
                    seen_codes.add(code)
                    teilnehmer_data.append((bespr_nr, code))

    db.executemany(
        "INSERT INTO termine (bespr_nr, bezeichnung, intervall, dauer_min) VALUES (?, ?, ?, ?)",
        termine_data,
    )
    logger.info("Imported %d termine", len(termine_data))

    db.executemany(
        "INSERT INTO termin_teilnehmer (bespr_nr, usergruppe) VALUES (?, ?)",
        teilnehmer_data,
    )
    logger.info("Imported %d termin_teilnehmer entries", len(teilnehmer_data))


def _import_terminliste(db: DatabaseInterface, ws: Any) -> None:
    """Import the Terminliste sheet (only non-derived columns)."""
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    data = []
    for r in rows:
        # Filter out None/empty rows (e.g. trailing row 828)
        if r[0] is None or r[4] is None:
            continue
        woche = int(r[0])
        tag = str(r[1]).strip()
        start = str(r[2]).strip()
        meeting = int(r[4])
        data.append((woche, tag, start, meeting))

    db.executemany(
        "INSERT INTO terminliste (woche, tag, start, meeting) VALUES (?, ?, ?, ?)",
        data,
    )
    logger.info("Imported %d terminliste entries", len(data))
