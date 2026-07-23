"""REST API routes for Resource Management (Personen, Rollen, Räume, Komponenten)."""

import logging

from flask import Blueprint, jsonify, request


from backend import auth
from backend.db.factory import get_database, integrity_errors
from backend.db.interface import DatabaseInterface

logger = logging.getLogger(__name__)

resources_bp = Blueprint("resources", __name__)


@resources_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


def _get_db() -> DatabaseInterface:
    db = get_database()
    db.connect()
    return db


# ===== Personen =====

@resources_bp.route("/personen", methods=["GET"])
def list_personen():
    db = _get_db()
    try:
        search = request.args.get("q", "").strip()
        if search:
            rows = db.fetchall(
                "SELECT * FROM personen WHERE vorname LIKE ? OR nachname LIKE ? OR email LIKE ? ORDER BY nachname, vorname",
                (f"%{search}%", f"%{search}%", f"%{search}%"),
            )
        else:
            rows = db.fetchall("SELECT * FROM personen ORDER BY nachname, vorname")
        return jsonify(rows)
    finally:
        db.disconnect()


@resources_bp.route("/personen/<int:pid>", methods=["GET"])
def get_person(pid: int):
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM personen WHERE id = ?", (pid,))
        if not row:
            return jsonify({"error": "Person nicht gefunden"}), 404
        roles = db.fetchall(
            "SELECT r.* FROM rollen r JOIN person_rollen pr ON r.id = pr.rolle_id WHERE pr.person_id = ?",
            (pid,),
        )
        row["rollen"] = roles
        return jsonify(row)
    finally:
        db.disconnect()


@resources_bp.route("/personen", methods=["POST"])
def create_person():
    body = request.get_json(silent=True) or {}
    vorname = (body.get("vorname") or "").strip()
    nachname = (body.get("nachname") or "").strip()
    if not vorname or not nachname:
        return jsonify({"error": "Vorname und Nachname sind erforderlich"}), 400
    db = _get_db()
    try:
        db.execute(
            "INSERT INTO personen (vorname, nachname, email, telefon, usergruppe, aktiv) VALUES (?, ?, ?, ?, ?, ?)",
            (vorname, nachname, body.get("email", ""), body.get("telefon", ""),
             body.get("usergruppe"), 1 if body.get("aktiv", True) else 0),
        )
        row = db.fetchone("SELECT * FROM personen ORDER BY id DESC LIMIT 1")
        return jsonify(row), 201
    finally:
        db.disconnect()


@resources_bp.route("/personen/<int:pid>", methods=["PUT"])
def update_person(pid: int):
    body = request.get_json(silent=True) or {}
    vorname = (body.get("vorname") or "").strip()
    nachname = (body.get("nachname") or "").strip()
    if not vorname or not nachname:
        return jsonify({"error": "Vorname und Nachname sind erforderlich"}), 400
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM personen WHERE id = ?", (pid,))
        if not existing:
            return jsonify({"error": "Person nicht gefunden"}), 404
        db.execute(
            "UPDATE personen SET vorname=?, nachname=?, email=?, telefon=?, usergruppe=?, aktiv=?, aktualisiert_am=datetime('now') WHERE id=?",
            (vorname, nachname, body.get("email", ""), body.get("telefon", ""),
             body.get("usergruppe"), 1 if body.get("aktiv", True) else 0, pid),
        )
        return jsonify(db.fetchone("SELECT * FROM personen WHERE id = ?", (pid,)))
    finally:
        db.disconnect()


@resources_bp.route("/personen/<int:pid>", methods=["DELETE"])
def delete_person(pid: int):
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM personen WHERE id = ?", (pid,))
        if not existing:
            return jsonify({"error": "Person nicht gefunden"}), 404
        db.execute("DELETE FROM personen WHERE id = ?", (pid,))
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


# ===== Rollen =====

@resources_bp.route("/rollen", methods=["GET"])
def list_rollen():
    db = _get_db()
    try:
        rows = db.fetchall("SELECT * FROM rollen ORDER BY bezeichnung")
        return jsonify(rows)
    finally:
        db.disconnect()


@resources_bp.route("/rollen/<int:rid>", methods=["GET"])
def get_rolle(rid: int):
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM rollen WHERE id = ?", (rid,))
        if not row:
            return jsonify({"error": "Rolle nicht gefunden"}), 404
        return jsonify(row)
    finally:
        db.disconnect()


@resources_bp.route("/rollen", methods=["POST"])
def create_rolle():
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    db = _get_db()
    try:
        db.execute(
            "INSERT INTO rollen (bezeichnung, beschreibung, farbe) VALUES (?, ?, ?)",
            (bez, body.get("beschreibung", ""), body.get("farbe", "#71717a")),
        )
        row = db.fetchone("SELECT * FROM rollen ORDER BY id DESC LIMIT 1")
        return jsonify(row), 201
    finally:
        db.disconnect()


@resources_bp.route("/rollen/<int:rid>", methods=["PUT"])
def update_rolle(rid: int):
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM rollen WHERE id = ?", (rid,))
        if not existing:
            return jsonify({"error": "Rolle nicht gefunden"}), 404
        db.execute(
            "UPDATE rollen SET bezeichnung=?, beschreibung=?, farbe=? WHERE id=?",
            (bez, body.get("beschreibung", ""), body.get("farbe", "#71717a"), rid),
        )
        return jsonify(db.fetchone("SELECT * FROM rollen WHERE id = ?", (rid,)))
    finally:
        db.disconnect()


@resources_bp.route("/rollen/<int:rid>", methods=["DELETE"])
def delete_rolle(rid: int):
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM rollen WHERE id = ?", (rid,))
        if not existing:
            return jsonify({"error": "Rolle nicht gefunden"}), 404
        db.execute("DELETE FROM rollen WHERE id = ?", (rid,))
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


# ===== Räume =====

@resources_bp.route("/raeume", methods=["GET"])
def list_raeume():
    db = _get_db()
    try:
        search = request.args.get("q", "").strip()
        if search:
            rows = db.fetchall(
                "SELECT * FROM raeume WHERE bezeichnung LIKE ? OR gebaeude LIKE ? ORDER BY bezeichnung",
                (f"%{search}%", f"%{search}%"),
            )
        else:
            rows = db.fetchall("SELECT * FROM raeume ORDER BY bezeichnung")
        return jsonify(rows)
    finally:
        db.disconnect()


@resources_bp.route("/raeume/<int:rid>", methods=["GET"])
def get_raum(rid: int):
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM raeume WHERE id = ?", (rid,))
        if not row:
            return jsonify({"error": "Raum nicht gefunden"}), 404
        return jsonify(row)
    finally:
        db.disconnect()


@resources_bp.route("/raeume", methods=["POST"])
def create_raum():
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    db = _get_db()
    try:
        kap = body.get("kapazitaet", 0)
        if not isinstance(kap, int) or kap < 0:
            return jsonify({"error": "Kapazität muss eine positive Zahl sein"}), 400
        db.execute(
            "INSERT INTO raeume (bezeichnung, gebaeude, kapazitaet, ausstattung, aktiv) VALUES (?, ?, ?, ?, ?)",
            (bez, body.get("gebaeude", ""), kap, body.get("ausstattung", ""),
             1 if body.get("aktiv", True) else 0),
        )
        row = db.fetchone("SELECT * FROM raeume ORDER BY id DESC LIMIT 1")
        return jsonify(row), 201
    finally:
        db.disconnect()


@resources_bp.route("/raeume/<int:rid>", methods=["PUT"])
def update_raum(rid: int):
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM raeume WHERE id = ?", (rid,))
        if not existing:
            return jsonify({"error": "Raum nicht gefunden"}), 404
        kap = body.get("kapazitaet", 0)
        if not isinstance(kap, int) or kap < 0:
            return jsonify({"error": "Kapazität muss eine positive Zahl sein"}), 400
        db.execute(
            "UPDATE raeume SET bezeichnung=?, gebaeude=?, kapazitaet=?, ausstattung=?, aktiv=? WHERE id=?",
            (bez, body.get("gebaeude", ""), kap, body.get("ausstattung", ""),
             1 if body.get("aktiv", True) else 0, rid),
        )
        return jsonify(db.fetchone("SELECT * FROM raeume WHERE id = ?", (rid,)))
    finally:
        db.disconnect()


@resources_bp.route("/raeume/<int:rid>", methods=["DELETE"])
def delete_raum(rid: int):
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM raeume WHERE id = ?", (rid,))
        if not existing:
            return jsonify({"error": "Raum nicht gefunden"}), 404
        db.execute("DELETE FROM raeume WHERE id = ?", (rid,))
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


# ===== Komponenten =====

@resources_bp.route("/komponenten", methods=["GET"])
def list_komponenten():
    db = _get_db()
    try:
        search = request.args.get("q", "").strip()
        if search:
            rows = db.fetchall(
                "SELECT * FROM komponenten WHERE bezeichnung LIKE ? OR typ LIKE ? ORDER BY bezeichnung",
                (f"%{search}%", f"%{search}%"),
            )
        else:
            rows = db.fetchall("SELECT * FROM komponenten ORDER BY bezeichnung")
        return jsonify(rows)
    finally:
        db.disconnect()


@resources_bp.route("/komponenten/<int:kid>", methods=["GET"])
def get_komponente(kid: int):
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM komponenten WHERE id = ?", (kid,))
        if not row:
            return jsonify({"error": "Komponente nicht gefunden"}), 404
        return jsonify(row)
    finally:
        db.disconnect()


@resources_bp.route("/komponenten", methods=["POST"])
def create_komponente():
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    db = _get_db()
    try:
        db.execute(
            "INSERT INTO komponenten (bezeichnung, typ, beschreibung, verfuegbar) VALUES (?, ?, ?, ?)",
            (bez, body.get("typ", ""), body.get("beschreibung", ""),
             1 if body.get("verfuegbar", True) else 0),
        )
        row = db.fetchone("SELECT * FROM komponenten ORDER BY id DESC LIMIT 1")
        return jsonify(row), 201
    finally:
        db.disconnect()


@resources_bp.route("/komponenten/<int:kid>", methods=["PUT"])
def update_komponente(kid: int):
    body = request.get_json(silent=True) or {}
    bez = (body.get("bezeichnung") or "").strip()
    if not bez:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM komponenten WHERE id = ?", (kid,))
        if not existing:
            return jsonify({"error": "Komponente nicht gefunden"}), 404
        db.execute(
            "UPDATE komponenten SET bezeichnung=?, typ=?, beschreibung=?, verfuegbar=? WHERE id=?",
            (bez, body.get("typ", ""), body.get("beschreibung", ""),
             1 if body.get("verfuegbar", True) else 0, kid),
        )
        return jsonify(db.fetchone("SELECT * FROM komponenten WHERE id = ?", (kid,)))
    finally:
        db.disconnect()


@resources_bp.route("/komponenten/<int:kid>", methods=["DELETE"])
def delete_komponente(kid: int):
    db = _get_db()
    try:
        existing = db.fetchone("SELECT id FROM komponenten WHERE id = ?", (kid,))
        if not existing:
            return jsonify({"error": "Komponente nicht gefunden"}), 404
        db.execute("DELETE FROM komponenten WHERE id = ?", (kid,))
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


# ===== Gruppen (read from existing bereiche/usergruppen, manage via groups) =====

@resources_bp.route("/gruppen", methods=["GET"])
def list_gruppen():
    """List bereiche with their usergruppen members."""
    db = _get_db()
    try:
        bereiche = db.fetchall("SELECT gruppe, bereich FROM bereiche ORDER BY gruppe")
        result = []
        for b in bereiche:
            members = db.fetchall(
                "SELECT nummer, bezeichnung, name FROM usergruppen WHERE bereich = ? ORDER BY nummer",
                (b["gruppe"],),
            )
            result.append({**b, "mitglieder": members})
        return jsonify(result)
    finally:
        db.disconnect()


def _gruppe_with_members(db: DatabaseInterface, gruppe: str) -> dict | None:
    row = db.fetchone("SELECT gruppe, bereich FROM bereiche WHERE gruppe = ?", (gruppe,))
    if not row:
        return None
    members = db.fetchall(
        "SELECT nummer, bezeichnung, name FROM usergruppen WHERE bereich = ? ORDER BY nummer",
        (gruppe,),
    )
    return {**row, "mitglieder": members}


@resources_bp.route("/gruppen", methods=["POST"])
def create_gruppe():
    body = request.get_json(silent=True) or {}
    gruppe = (body.get("gruppe") or "").strip()
    bereich = (body.get("bereich") or "").strip()
    if not gruppe or not bereich:
        return jsonify({"error": "Gruppe (Kürzel) und Bereich sind erforderlich"}), 400
    db = _get_db()
    try:
        if db.fetchone("SELECT gruppe FROM bereiche WHERE gruppe = ?", (gruppe,)):
            return jsonify({"error": "Diese Gruppe existiert bereits"}), 409
        db.execute("INSERT INTO bereiche (gruppe, bereich) VALUES (?, ?)", (gruppe, bereich))
        return jsonify(_gruppe_with_members(db, gruppe)), 201
    finally:
        db.disconnect()


@resources_bp.route("/gruppen/<gruppe>", methods=["PUT"])
def update_gruppe(gruppe: str):
    body = request.get_json(silent=True) or {}
    bereich = (body.get("bereich") or "").strip()
    if not bereich:
        return jsonify({"error": "Bereich ist erforderlich"}), 400
    db = _get_db()
    try:
        if not db.fetchone("SELECT gruppe FROM bereiche WHERE gruppe = ?", (gruppe,)):
            return jsonify({"error": "Gruppe nicht gefunden"}), 404
        db.execute("UPDATE bereiche SET bereich = ? WHERE gruppe = ?", (bereich, gruppe))
        return jsonify(_gruppe_with_members(db, gruppe))
    finally:
        db.disconnect()


@resources_bp.route("/gruppen/<gruppe>", methods=["DELETE"])
def delete_gruppe(gruppe: str):
    db = _get_db()
    try:
        if not db.fetchone("SELECT gruppe FROM bereiche WHERE gruppe = ?", (gruppe,)):
            return jsonify({"error": "Gruppe nicht gefunden"}), 404
        try:
            db.execute("DELETE FROM bereiche WHERE gruppe = ?", (gruppe,))
        except integrity_errors():
            return jsonify({"error": "Gruppe hat noch Mitglieder und kann nicht gelöscht werden"}), 409
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


# ===== Gruppen-Mitglieder (usergruppen) =====

@resources_bp.route("/gruppen/<gruppe>/mitglieder", methods=["POST"])
def create_mitglied(gruppe: str):
    body = request.get_json(silent=True) or {}
    nummer = (body.get("nummer") or "").strip()
    bezeichnung = (body.get("bezeichnung") or "").strip()
    if not nummer or not bezeichnung:
        return jsonify({"error": "Nummer und Bezeichnung sind erforderlich"}), 400
    db = _get_db()
    try:
        if not db.fetchone("SELECT gruppe FROM bereiche WHERE gruppe = ?", (gruppe,)):
            return jsonify({"error": "Gruppe nicht gefunden"}), 404
        if db.fetchone("SELECT nummer FROM usergruppen WHERE nummer = ?", (nummer,)):
            return jsonify({"error": "Diese Nummer existiert bereits"}), 409
        db.execute(
            "INSERT INTO usergruppen (nummer, bereich, bezeichnung, name) VALUES (?, ?, ?, ?)",
            (nummer, gruppe, bezeichnung, body.get("name") or None),
        )
        return jsonify(db.fetchone("SELECT nummer, bezeichnung, name FROM usergruppen WHERE nummer = ?", (nummer,))), 201
    finally:
        db.disconnect()


@resources_bp.route("/mitglieder/<nummer>", methods=["PUT"])
def update_mitglied(nummer: str):
    body = request.get_json(silent=True) or {}
    bezeichnung = (body.get("bezeichnung") or "").strip()
    if not bezeichnung:
        return jsonify({"error": "Bezeichnung ist erforderlich"}), 400
    db = _get_db()
    try:
        if not db.fetchone("SELECT nummer FROM usergruppen WHERE nummer = ?", (nummer,)):
            return jsonify({"error": "Mitglied nicht gefunden"}), 404
        db.execute(
            "UPDATE usergruppen SET bezeichnung = ?, name = ? WHERE nummer = ?",
            (bezeichnung, body.get("name") or None, nummer),
        )
        return jsonify(db.fetchone("SELECT nummer, bezeichnung, name FROM usergruppen WHERE nummer = ?", (nummer,)))
    finally:
        db.disconnect()


@resources_bp.route("/mitglieder/<nummer>", methods=["DELETE"])
def delete_mitglied(nummer: str):
    db = _get_db()
    try:
        if not db.fetchone("SELECT nummer FROM usergruppen WHERE nummer = ?", (nummer,)):
            return jsonify({"error": "Mitglied nicht gefunden"}), 404
        try:
            db.execute("DELETE FROM usergruppen WHERE nummer = ?", (nummer,))
        except integrity_errors():
            return jsonify({"error": "Mitglied wird noch verwendet und kann nicht gelöscht werden"}), 409
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()


# ===== Termine (compatible read/write over existing termine/terminliste) =====

@resources_bp.route("/termine", methods=["GET"])
def list_termine():
    """List all meeting definitions from the existing termine table."""
    db = _get_db()
    try:
        rows = db.fetchall(
            """SELECT t.bespr_nr, t.bezeichnung, t.intervall, t.dauer_min,
                      i.bedeutung as intervall_text
               FROM termine t
               LEFT JOIN intervalle i ON t.intervall = i.kuerzel
               ORDER BY t.bespr_nr"""
        )
        for row in rows:
            row["teilnehmer"] = [
                item["usergruppe"]
                for item in db.fetchall(
                    "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY usergruppe",
                    (row["bespr_nr"],),
                )
            ]
        return jsonify(rows)
    finally:
        db.disconnect()


def _termin_with_intervall(db: DatabaseInterface, nr: int) -> dict | None:
    row = db.fetchone(
        """SELECT t.bespr_nr, t.bezeichnung, t.intervall, t.dauer_min,
                  i.bedeutung as intervall_text
           FROM termine t
           LEFT JOIN intervalle i ON t.intervall = i.kuerzel
           WHERE t.bespr_nr = ?""",
        (nr,),
    )
    if row:
        row["teilnehmer"] = [
            item["usergruppe"]
            for item in db.fetchall(
                "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY usergruppe",
                (nr,),
            )
        ]
    return row


def _validated_teilnehmer(db: DatabaseInterface, body: dict) -> tuple[list[str], tuple | None]:
    raw = body.get("teilnehmer", [])
    if not isinstance(raw, list):
        return [], (jsonify({"error": "Teilnehmer muss eine Liste sein"}), 400)
    values = list(dict.fromkeys(str(value).strip() for value in raw if str(value).strip()))
    for value in values:
        if not db.fetchone("SELECT nummer FROM usergruppen WHERE nummer = ?", (value,)):
            return [], (jsonify({"error": f"Unbekannte Benutzergruppe: {value}"}), 400)
    return values, None


def _replace_teilnehmer(db: DatabaseInterface, nr: int, teilnehmer: list[str]) -> None:
    db.execute("DELETE FROM termin_teilnehmer WHERE bespr_nr = ?", (nr,))
    for usergruppe in teilnehmer:
        db.execute(
            "INSERT INTO termin_teilnehmer (bespr_nr, usergruppe) VALUES (?, ?)",
            (nr, usergruppe),
        )


@resources_bp.route("/termine", methods=["POST"])
def create_termin():
    body = request.get_json(silent=True) or {}
    bezeichnung = (body.get("bezeichnung") or "").strip()
    intervall = (body.get("intervall") or "").strip()
    if not bezeichnung or not intervall:
        return jsonify({"error": "Bezeichnung und Intervall sind erforderlich"}), 400
    try:
        dauer_min = int(body.get("dauer_min"))
    except (TypeError, ValueError):
        return jsonify({"error": "Dauer (Minuten) muss eine Zahl sein"}), 400
    db = _get_db()
    try:
        teilnehmer, validation_error = _validated_teilnehmer(db, body)
        if validation_error:
            return validation_error
        bespr_nr = body.get("bespr_nr")
        if bespr_nr in (None, ""):
            row = db.fetchone("SELECT MAX(bespr_nr) AS m FROM termine")
            bespr_nr = (row["m"] or 0) + 1 if row else 1
        else:
            try:
                bespr_nr = int(bespr_nr)
            except (TypeError, ValueError):
                return jsonify({"error": "Besprechungsnummer muss eine Zahl sein"}), 400
            if db.fetchone("SELECT bespr_nr FROM termine WHERE bespr_nr = ?", (bespr_nr,)):
                return jsonify({"error": "Diese Besprechungsnummer existiert bereits"}), 409
        if not db.fetchone("SELECT kuerzel FROM intervalle WHERE kuerzel = ?", (intervall,)):
            return jsonify({"error": "Unbekanntes Intervall"}), 400
        db.execute(
            "INSERT INTO termine (bespr_nr, bezeichnung, intervall, dauer_min) VALUES (?, ?, ?, ?)",
            (bespr_nr, bezeichnung, intervall, dauer_min),
        )
        _replace_teilnehmer(db, bespr_nr, teilnehmer)
        return jsonify(_termin_with_intervall(db, bespr_nr)), 201
    finally:
        db.disconnect()


@resources_bp.route("/termine/<int:nr>", methods=["PUT"])
def update_termin(nr: int):
    body = request.get_json(silent=True) or {}
    bezeichnung = (body.get("bezeichnung") or "").strip()
    intervall = (body.get("intervall") or "").strip()
    if not bezeichnung or not intervall:
        return jsonify({"error": "Bezeichnung und Intervall sind erforderlich"}), 400
    try:
        dauer_min = int(body.get("dauer_min"))
    except (TypeError, ValueError):
        return jsonify({"error": "Dauer (Minuten) muss eine Zahl sein"}), 400
    db = _get_db()
    try:
        teilnehmer, validation_error = _validated_teilnehmer(db, body)
        if validation_error:
            return validation_error
        if not db.fetchone("SELECT bespr_nr FROM termine WHERE bespr_nr = ?", (nr,)):
            return jsonify({"error": "Termin nicht gefunden"}), 404
        if not db.fetchone("SELECT kuerzel FROM intervalle WHERE kuerzel = ?", (intervall,)):
            return jsonify({"error": "Unbekanntes Intervall"}), 400
        db.execute(
            "UPDATE termine SET bezeichnung = ?, intervall = ?, dauer_min = ? WHERE bespr_nr = ?",
            (bezeichnung, intervall, dauer_min, nr),
        )
        _replace_teilnehmer(db, nr, teilnehmer)
        return jsonify(_termin_with_intervall(db, nr))
    finally:
        db.disconnect()


@resources_bp.route("/termine/<int:nr>", methods=["DELETE"])
def delete_termin(nr: int):
    db = _get_db()
    try:
        if not db.fetchone("SELECT bespr_nr FROM termine WHERE bespr_nr = ?", (nr,)):
            return jsonify({"error": "Termin nicht gefunden"}), 404
        db.execute("DELETE FROM termin_teilnehmer WHERE bespr_nr = ?", (nr,))
        try:
            db.execute("DELETE FROM termine WHERE bespr_nr = ?", (nr,))
        except integrity_errors():
            return jsonify({"error": "Termin ist noch verplant und kann nicht gelöscht werden"}), 409
        return jsonify({"status": "ok"})
    finally:
        db.disconnect()
