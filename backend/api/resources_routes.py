"""REST API routes for Resource Management (Personen, Rollen, Räume, Komponenten)."""

import logging

from flask import Blueprint, jsonify, request

from backend import auth
from backend.config import DB_PATH
from backend.db.sqlite_adapter import SQLiteAdapter

logger = logging.getLogger(__name__)

resources_bp = Blueprint("resources", __name__)


@resources_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


def _get_db() -> SQLiteAdapter:
    db = SQLiteAdapter(DB_PATH)
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
        return jsonify(rows)
    finally:
        db.disconnect()
