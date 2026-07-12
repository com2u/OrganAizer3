"""REST API routes for Terminlandschaft."""

import logging
import os
import tempfile

from flask import Blueprint, g, jsonify, request, send_file

from backend import auth
from backend.config import DB_PATH
from backend.db.sqlite_adapter import SQLiteAdapter

logger = logging.getLogger(__name__)

api_bp = Blueprint("api", __name__)


@api_bp.before_request
def _enforce_auth():
    """Protect all /api routes (except login) with OpenWebUI-based auth."""
    return auth.enforce_auth()


@api_bp.route("/auth/login", methods=["POST"])
def auth_login():
    """Authenticate against OpenWebUI and return a session token."""
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    if not email or not password:
        return jsonify({"error": "E-Mail und Passwort erforderlich"}), 400
    try:
        data = auth.signin(email, password)
    except Exception:
        logger.exception("Auth backend unreachable")
        return jsonify({"error": "Anmeldedienst nicht erreichbar"}), 503
    if not data:
        return jsonify({"error": "E-Mail oder Passwort ist falsch"}), 401
    return jsonify({"token": data["token"], "user": auth.public_user(data)})


@api_bp.route("/auth/me", methods=["GET"])
def auth_me():
    """Return the currently authenticated user."""
    user = getattr(g, "user", None)
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(auth.public_user(user))


def get_db() -> SQLiteAdapter:
    """Create and return a database connection."""
    db = SQLiteAdapter(DB_PATH)
    db.connect()
    return db


def _add_minutes(time_str: str, minutes: int) -> str:
    """Add minutes to a HH:MM time string."""
    parts = time_str.split(":")
    total = int(parts[0]) * 60 + int(parts[1]) + minutes
    return f"{total // 60:02d}:{total % 60:02d}"


@api_bp.route("/weeks", methods=["GET"])
def get_weeks():
    """Return list of available calendar weeks."""
    db = get_db()
    try:
        rows = db.fetchall("SELECT DISTINCT woche FROM terminliste ORDER BY woche")
        return jsonify([r["woche"] for r in rows])
    finally:
        db.disconnect()


@api_bp.route("/week/<int:week>", methods=["GET"])
def get_week_appointments(week: int):
    """Return all appointments for a given week with full details."""
    db = get_db()
    try:
        rows = db.fetchall(
            """
            SELECT
                tl.id,
                tl.woche,
                tl.tag,
                tl.start,
                t.bespr_nr,
                t.bezeichnung,
                t.intervall,
                t.dauer_min,
                i.bedeutung as intervall_text
            FROM terminliste tl
            JOIN termine t ON tl.meeting = t.bespr_nr
            LEFT JOIN intervalle i ON t.intervall = i.kuerzel
            WHERE tl.woche = ?
            ORDER BY
                CASE tl.tag
                    WHEN 'Mon' THEN 1
                    WHEN 'Tue' THEN 2
                    WHEN 'Wed' THEN 3
                    WHEN 'Thu' THEN 4
                    WHEN 'Fri' THEN 5
                    WHEN 'Sat' THEN 6
                    WHEN 'Sun' THEN 7
                END,
                tl.start,
                tl.id
            """,
            (week,),
        )

        result = []
        for r in rows:
            participants = db.fetchall(
                "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY rowid",
                (r["bespr_nr"],),
            )
            participant_codes = [p["usergruppe"] for p in participants]

            # Determine bereich groups for filtering
            bereich_groups = set()
            for code in participant_codes:
                if len(code) == 1:
                    bereich_groups.add(code)
                else:
                    bereich_groups.add(code[0])

            result.append(
                {
                    "id": r["id"],
                    "woche": r["woche"],
                    "tag": r["tag"],
                    "start": r["start"],
                    "ende": _add_minutes(r["start"], r["dauer_min"]),
                    "bespr_nr": r["bespr_nr"],
                    "bezeichnung": r["bezeichnung"],
                    "intervall": r["intervall"],
                    "intervall_text": r["intervall_text"],
                    "dauer_min": r["dauer_min"],
                    "teilnehmer": participant_codes,
                    "bereich_groups": sorted(bereich_groups),
                }
            )
        return jsonify(result)
    finally:
        db.disconnect()


@api_bp.route("/termine/<int:nr>", methods=["GET"])
def get_termin_detail(nr: int):
    """Return full meeting details for the detail modal."""
    db = get_db()
    try:
        termin = db.fetchone(
            """
            SELECT t.bespr_nr, t.bezeichnung, t.intervall, t.dauer_min,
                   i.bedeutung as intervall_text
            FROM termine t
            LEFT JOIN intervalle i ON t.intervall = i.kuerzel
            WHERE t.bespr_nr = ?
            """,
            (nr,),
        )
        if not termin:
            return jsonify({"error": "Not found"}), 404

        # Get participant codes and resolve names
        participants = db.fetchall(
            "SELECT usergruppe FROM termin_teilnehmer WHERE bespr_nr = ? ORDER BY rowid",
            (nr,),
        )

        resolved = []
        for p in participants:
            code = p["usergruppe"]
            if len(code) == 1:
                # Entire department
                members = db.fetchall(
                    "SELECT nummer, bezeichnung, name FROM usergruppen WHERE bereich = ? ORDER BY nummer",
                    (code,),
                )
                resolved.append(
                    {
                        "code": code,
                        "type": "group",
                        "members": [
                            {
                                "nummer": m["nummer"],
                                "bezeichnung": m["bezeichnung"],
                                "name": m["name"],
                            }
                            for m in members
                        ],
                    }
                )
            else:
                ug = db.fetchone(
                    "SELECT nummer, bezeichnung, name, bereich FROM usergruppen WHERE nummer = ?",
                    (code,),
                )
                if ug:
                    resolved.append(
                        {
                            "code": code,
                            "type": "individual",
                            "nummer": ug["nummer"],
                            "bezeichnung": ug["bezeichnung"],
                            "name": ug["name"],
                            "bereich": ug["bereich"],
                        }
                    )
                else:
                    resolved.append({"code": code, "type": "unknown"})

        # Get scheduled instances
        instances = db.fetchall(
            """
            SELECT woche, tag, start FROM terminliste
            WHERE meeting = ?
            ORDER BY woche,
                CASE tag
                    WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
                    WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5
                END
            """,
            (nr,),
        )

        return jsonify(
            {
                "bespr_nr": termin["bespr_nr"],
                "bezeichnung": termin["bezeichnung"],
                "intervall": termin["intervall"],
                "intervall_text": termin["intervall_text"],
                "dauer_min": termin["dauer_min"],
                "teilnehmer": resolved,
                "instances": [dict(i) for i in instances],
            }
        )
    finally:
        db.disconnect()


@api_bp.route("/bereiche", methods=["GET"])
def get_bereiche():
    """Return all department groups."""
    db = get_db()
    try:
        rows = db.fetchall("SELECT gruppe, bereich FROM bereiche ORDER BY gruppe")
        return jsonify(rows)
    finally:
        db.disconnect()


@api_bp.route("/usergruppen", methods=["GET"])
def get_usergruppen():
    """Return all user groups."""
    db = get_db()
    try:
        rows = db.fetchall(
            "SELECT nummer, bereich, bezeichnung, name FROM usergruppen ORDER BY nummer"
        )
        return jsonify(rows)
    finally:
        db.disconnect()


@api_bp.route("/intervalle", methods=["GET"])
def get_intervalle():
    """Return all interval codes."""
    db = get_db()
    try:
        rows = db.fetchall("SELECT kuerzel, bedeutung FROM intervalle ORDER BY kuerzel")
        return jsonify(rows)
    finally:
        db.disconnect()


@api_bp.route("/import", methods=["POST"])
def import_data():
    """Upload an Excel file and import it into the database."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.endswith(".xlsx"):
        return jsonify({"error": "File must be .xlsx"}), 400

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        from backend.services.import_service import import_excel

        import_db = get_db()
        try:
            import_db.create_tables()
            import_excel(import_db, tmp_path)
        finally:
            import_db.disconnect()
        return jsonify({"status": "ok", "message": "Import successful"})
    except Exception as e:
        logger.exception("Import failed")
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(tmp_path)


@api_bp.route("/export", methods=["GET"])
def export_data():
    """Export the database as an Excel file."""
    from backend.services.export_service import export_excel

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        export_db = get_db()
        try:
            export_excel(export_db, tmp_path)
        finally:
            export_db.disconnect()
        return send_file(
            tmp_path,
            as_attachment=True,
            download_name="terminlandschaft_export.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        logger.exception("Export failed")
        return jsonify({"error": str(e)}), 500
