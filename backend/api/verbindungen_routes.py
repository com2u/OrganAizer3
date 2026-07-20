"""REST API routes for integration connections (Verbindungen).

Manages metadata for prepared integration templates.
No actual OAuth/API connectivity is implemented here – status is always 'prepared'.
No secrets, tokens, passwords, or API keys are ever stored or returned.
"""

import logging

from flask import Blueprint, jsonify, request

from backend import auth
from backend.config import DB_PATH
from backend.db.sqlite_adapter import SQLiteAdapter

logger = logging.getLogger(__name__)

verbindungen_bp = Blueprint("verbindungen", __name__)


@verbindungen_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


# Allowlist of valid template keys – exactly matching the 16 specified templates
VALID_TEMPLATE_KEYS = (
    "office",
    "outlook_kalender",
    "outlook_mail",
    "outlook_kontakte",
    "outlook_aufgaben",
    "google_kalender",
    "onenote",
    "sharepoint",
    "google_mail",
    "google_kontakte",
    "google_aufgaben",
    "onedrive",
    "jira",
    "confluence",
    "n8n",
    "mcp",
)


def _get_db() -> SQLiteAdapter:
    db = SQLiteAdapter(DB_PATH)
    db.connect()
    return db


def _row_to_dict(row: dict) -> dict:
    """Convert a database row to a safe API response dict (no secrets)."""
    return {
        "id": row["id"],
        "template_key": row["template_key"],
        "name": row["name"],
        "status": row["status"],
        "beschreibung": row.get("beschreibung"),
        "erstellt_am": row.get("erstellt_am"),
        "aktualisiert_am": row.get("aktualisiert_am"),
    }


@verbindungen_bp.route("", methods=["GET"])
def list_verbindungen():
    """List all added connections (metadata only, no secrets)."""
    db = _get_db()
    try:
        rows = db.fetchall(
            "SELECT * FROM verbindungen ORDER BY erstellt_am DESC"
        )
        return jsonify([_row_to_dict(r) for r in rows])
    finally:
        db.disconnect()


@verbindungen_bp.route("", methods=["POST"])
def create_verbindung():
    """Add a new prepared connection from a template."""
    data = request.get_json(silent=True) or {}

    template_key = (data.get("template_key") or "").strip().lower()
    name = (data.get("name") or "").strip()
    beschreibung = (data.get("beschreibung") or "").strip() or None

    if not template_key:
        return jsonify({"error": "template_key is required"}), 400
    if template_key not in VALID_TEMPLATE_KEYS:
        return jsonify({
            "error": f"Unknown template_key '{template_key}'. "
                     f"Allowed: {', '.join(VALID_TEMPLATE_KEYS)}"
        }), 400
    if not name:
        return jsonify({"error": "name is required"}), 400
    if len(name) > 200:
        return jsonify({"error": "name must not exceed 200 characters"}), 400

    db = _get_db()
    try:
        db.execute(
            """INSERT INTO verbindungen (template_key, name, status, beschreibung)
               VALUES (?, ?, 'prepared', ?)""",
            (template_key, name, beschreibung),
        )
        row = db.fetchone(
            """SELECT * FROM verbindungen
               WHERE template_key = ? AND name = ?
               ORDER BY id DESC LIMIT 1""",
            (template_key, name),
        )
        if row is None:
            logger.error("Inserted connection could not be retrieved")
            return jsonify({"error": "Connection could not be created"}), 500
        return jsonify(_row_to_dict(row)), 201
    finally:
        db.disconnect()


@verbindungen_bp.route("/<int:conn_id>", methods=["DELETE"])
def delete_verbindung(conn_id: int):
    """Delete an added connection."""
    db = _get_db()
    try:
        existing = db.fetchone("SELECT * FROM verbindungen WHERE id = ?", (conn_id,))
        if not existing:
            return jsonify({"error": "Connection not found"}), 404
        db.execute("DELETE FROM verbindungen WHERE id = ?", (conn_id,))
        return jsonify({"status": "deleted", "id": conn_id})
    finally:
        db.disconnect()
