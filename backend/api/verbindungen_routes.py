"""REST API routes and local configuration for external integrations."""

import logging

from flask import Blueprint, jsonify, request

from backend import auth
from backend.db.factory import get_database
from backend.db.interface import DatabaseInterface
from backend.integration_config import is_configured, public_config, write_config

logger = logging.getLogger(__name__)

verbindungen_bp = Blueprint("verbindungen", __name__)


@verbindungen_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


# Allowlist of valid template keys – the prepared integration templates
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
    "sap",
    "interflex",
    "n8n",
    "open_notebook",
    "slidev",
    "mcp",
)


def _get_db() -> DatabaseInterface:
    db = get_database()
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


@verbindungen_bp.get("/capabilities")
def capabilities():
    """Navigation capabilities; never includes integration secrets."""
    db = _get_db()
    try:
        rows = db.fetchall("SELECT DISTINCT template_key FROM verbindungen")
        added = {r["template_key"] for r in rows}
        result = {}
        for key in ("open_notebook", "slidev"):
            cfg = public_config(key)
            result[key] = {
                "added": key in added,
                "configured": key in added and is_configured(key),
                "public_url": cfg.get("public_url", ""),
            }
        n8n = db.fetchone("SELECT base_url, aktiv FROM n8n_config WHERE id = 1")
        result["n8n"] = {
            "added": "n8n" in added,
            "configured": "n8n" in added and bool(n8n and n8n.get("aktiv") and n8n.get("base_url")),
            "public_url": n8n.get("base_url", "") if n8n else "",
        }
        return jsonify(result)
    finally:
        db.disconnect()


@verbindungen_bp.route("/integrations/<key>", methods=["GET", "PUT"])
def integration_settings(key: str):
    if key not in ("open_notebook", "slidev"):
        return jsonify({"error": "Diese Integration wird hier nicht konfiguriert."}), 404
    if request.method == "GET":
        return jsonify(public_config(key))
    data = request.get_json(silent=True) or {}
    allowed = {
        "open_notebook": {"enabled", "public_url", "api_url", "encryption_key", "password", "db_password"},
        "slidev": {"enabled", "public_url", "project_name"},
    }[key]
    clean = {k: v.strip() if isinstance(v, str) else v for k, v in data.items() if k in allowed}
    if "public_url" in clean and clean["public_url"] and not clean["public_url"].startswith(("http://", "https://")):
        return jsonify({"error": "Die öffentliche URL muss mit http:// oder https:// beginnen."}), 400
    result = write_config(key, clean)
    db = _get_db()
    try:
        db.execute(
            "UPDATE verbindungen SET status = ? WHERE template_key = ?",
            ("configured" if is_configured(key) else "prepared", key),
        )
    finally:
        db.disconnect()
    return jsonify(result)


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
