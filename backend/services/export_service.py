"""Export service: writes the database contents to an Excel file."""

import logging

import openpyxl
from openpyxl.utils import get_column_letter

from backend.db.interface import DatabaseInterface

logger = logging.getLogger(__name__)


def export_excel(db: DatabaseInterface, filepath: str) -> None:
    """Export all database tables to an Excel file matching the original format."""
    logger.info("Starting export to %s", filepath)
    wb = openpyxl.Workbook()

    # Remove default sheet
    if wb.active is not None:
        wb.remove(wb.active)

    _export_bereiche(db, wb)
    _export_usergruppen(db, wb)
    _export_termine(db, wb)
    _export_terminliste(db, wb)
    _export_intervalle(db, wb)

    wb.save(filepath)
    logger.info("Export completed: %s", filepath)


def _export_bereiche(db: DatabaseInterface, wb: openpyxl.Workbook) -> None:
    """Export Bereiche sheet."""
    ws = wb.create_sheet("Bereiche")
    ws.append(["Gruppe", "Bereich"])
    rows = db.fetchall("SELECT gruppe, bereich FROM bereiche ORDER BY gruppe")
    for r in rows:
        ws.append([r["gruppe"], r["bereich"]])
    logger.info("Exported %d bereiche", len(rows))


def _export_usergruppen(db: DatabaseInterface, wb: openpyxl.Workbook) -> None:
    """Export Usergruppen sheet."""
    ws = wb.create_sheet("Usergruppen")
    ws.append(["Bereich", "Nummer", "Bezeichnung", "Name"])
    rows = db.fetchall(
        "SELECT bereich, nummer, bezeichnung, name FROM usergruppen ORDER BY nummer"
    )
    for r in rows:
        ws.append([r["bereich"], r["nummer"], r["bezeichnung"], r["name"]])
    logger.info("Exported %d usergruppen", len(rows))


def _export_termine(db: DatabaseInterface, wb: openpyxl.Workbook) -> None:
    """Export Termine sheet with variable-width participant columns."""
    ws = wb.create_sheet("Termine")

    # Determine max number of participants across all meetings
    max_result = db.fetchone(
        "SELECT MAX(cnt) as max_cnt FROM "
        "(SELECT COUNT(*) as cnt FROM termin_teilnehmer GROUP BY bespr_nr)"
    )
    max_participants = (
        max_result["max_cnt"] if max_result and max_result["max_cnt"] else 0
    )

    # Header: first 4 fixed columns + participant columns
    header = ["Bespr.Nr.", "Bezeichung", "Intervall", "Dauer (min)"]
    if max_participants > 0:
        header.append("Usergruppen zur Teilnahme")
        # Remaining participant columns have no header
        header.extend([""] * (max_participants - 1))
    ws.append(header)

    # Data rows
    termine = db.fetchall(
        "SELECT bespr_nr, bezeichnung, intervall, dauer_min FROM termine ORDER BY bespr_nr"
    )
    for t in termine:
        participants = db.fetchall(
            "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY usergruppe",
            (t["bespr_nr"],),
        )
        row = [t["bespr_nr"], t["bezeichnung"], t["intervall"], t["dauer_min"]]
        row.extend(p["usergruppe"] for p in participants)
        ws.append(row)

    logger.info("Exported %d termine", len(termine))


def _add_minutes(time_str: str, minutes: int) -> str:
    """Add minutes to a HH:MM time string and return HH:MM."""
    parts = time_str.split(":")
    total_min = int(parts[0]) * 60 + int(parts[1]) + minutes
    h = total_min // 60
    m = total_min % 60
    return f"{h:02d}:{m:02d}"


def _export_terminliste(db: DatabaseInterface, wb: openpyxl.Workbook) -> None:
    """Export Terminliste sheet with all derived fields reconstructed."""
    ws = wb.create_sheet("Terminliste")
    ws.append(
        [
            "Woche",
            "Tag",
            "Start",
            "Ende",
            "Meeting",
            "Name",
            "Intervall",
            "Dauer (min)",
            "Teilnehmer (Quelle)",
        ]
    )

    rows = db.fetchall("""
        SELECT
            tl.woche,
            tl.tag,
            tl.start,
            t.bespr_nr,
            t.bezeichnung,
            t.intervall,
            t.dauer_min
        FROM terminliste tl
        JOIN termine t ON tl.meeting = t.bespr_nr
        ORDER BY tl.woche, 
            CASE tl.tag 
                WHEN 'Mon' THEN 1 
                WHEN 'Tue' THEN 2 
                WHEN 'Wed' THEN 3 
                WHEN 'Thu' THEN 4 
                WHEN 'Fri' THEN 5 
            END,
            tl.start,
            tl.id
    """)

    for r in rows:
        # Get participants for this meeting
        participants = db.fetchall(
            "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY usergruppe",
            (r["bespr_nr"],),
        )
        teilnehmer_str = ", ".join(p["usergruppe"] for p in participants)
        ende = _add_minutes(r["start"], r["dauer_min"])

        ws.append(
            [
                r["woche"],
                r["tag"],
                r["start"],
                ende,
                r["bespr_nr"],
                r["bezeichnung"],
                r["intervall"],
                r["dauer_min"],
                teilnehmer_str,
            ]
        )

    logger.info("Exported %d terminliste entries", len(rows))


def _export_intervalle(db: DatabaseInterface, wb: openpyxl.Workbook) -> None:
    """Export Intervalle sheet."""
    ws = wb.create_sheet("Intervalle")
    ws.append(["Kürzel", "Bedeutung"])
    rows = db.fetchall("SELECT kuerzel, bedeutung FROM intervalle ORDER BY kuerzel")
    for r in rows:
        ws.append([r["kuerzel"], r["bedeutung"]])
    logger.info("Exported %d intervalle", len(rows))
