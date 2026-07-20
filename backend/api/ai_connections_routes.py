"""REST API routes for AI connections (KI-Verbindungen)."""

import json
import logging
import re
import ipaddress
import socket
import urllib.request
import urllib.error
from urllib.parse import urlparse

from flask import Blueprint, jsonify, request

from backend import auth
from backend.config import DB_PATH
from backend.db.sqlite_adapter import SQLiteAdapter

logger = logging.getLogger(__name__)

ai_connections_bp = Blueprint("ai_connections", __name__)


@ai_connections_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()

VALID_PROVIDERS = ("ollama", "llama_cpp", "bedrock", "copilot", "openai", "claude", "gemini", "openrouter")
VALID_CATEGORIES = ("lokal", "eigen", "cloud")

PROVIDER_CATEGORY_MAP = {
    "ollama": "lokal",
    "llama_cpp": "lokal",
    "bedrock": "eigen",
    "copilot": "cloud",
    "openai": "cloud",
    "claude": "cloud",
    "gemini": "cloud",
    "openrouter": "cloud",
}

# URL pattern for basic validation
_URL_RE = re.compile(r"^https?://[^\s]+$", re.IGNORECASE)


def _get_db() -> SQLiteAdapter:
    db = SQLiteAdapter(DB_PATH)
    db.connect()
    return db


def _redact_row(row: dict) -> dict:
    """Remove secret_ref value, replace with has_secret boolean."""
    out = dict(row)
    has_secret = bool(out.pop("secret_ref", None))
    out["secret_configured"] = has_secret
    return out


def _validate_connection(data: dict) -> tuple[dict | None, str | None]:
    """Validate and normalize input data. Returns (cleaned, error)."""
    name = (data.get("name") or "").strip()
    provider = (data.get("provider") or "").strip().lower()
    kategorie = (data.get("kategorie") or "").strip().lower()
    model_name = (data.get("model_name") or "").strip() or None
    base_url = (data.get("base_url") or "").strip() or None
    region = (data.get("region") or "").strip() or None
    endpoint = (data.get("endpoint") or "").strip() or None
    secret_ref = (data.get("secret_ref") or "").strip() or None
    aktiv = 1 if data.get("aktiv", True) else 0
    metadata_json = data.get("metadata_json")

    if not name:
        return None, "name is required"
    if provider not in VALID_PROVIDERS:
        return None, f"Unknown provider '{provider}'. Allowed: {', '.join(VALID_PROVIDERS)}"
    if not kategorie:
        kategorie = PROVIDER_CATEGORY_MAP.get(provider, "cloud")
    if kategorie not in VALID_CATEGORIES:
        return None, f"Unknown kategorie '{kategorie}'. Allowed: {', '.join(VALID_CATEGORIES)}"

    # Provider-specific validation
    if provider in ("ollama", "llama_cpp"):
        if not base_url:
            return None, f"base_url is required for provider '{provider}'"
    if provider == "bedrock":
        if not region:
            return None, "region is required for provider 'bedrock'"
    if provider in ("copilot", "openai", "claude", "gemini", "openrouter"):
        if not model_name:
            return None, f"model_name is required for provider '{provider}'"

    # URL format validation
    if base_url and not _URL_RE.match(base_url):
        return None, "base_url must be a valid http/https URL"
    if endpoint and not _URL_RE.match(endpoint):
        return None, "endpoint must be a valid http/https URL"

    # secret_ref should be env var name pattern (no spaces, no slashes)
    if secret_ref and not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", secret_ref):
        return None, "secret_ref must be a valid environment variable name (e.g. MY_API_KEY)"

    if metadata_json and isinstance(metadata_json, str):
        try:
            json.loads(metadata_json)
        except (json.JSONDecodeError, TypeError):
            return None, "metadata_json must be valid JSON"
    elif metadata_json and isinstance(metadata_json, dict):
        metadata_json = json.dumps(metadata_json)

    return {
        "name": name,
        "provider": provider,
        "kategorie": kategorie,
        "model_name": model_name,
        "base_url": base_url,
        "region": region,
        "endpoint": endpoint,
        "secret_ref": secret_ref,
        "aktiv": aktiv,
        "metadata_json": metadata_json if isinstance(metadata_json, str) else (json.dumps(metadata_json) if metadata_json else None),
    }, None


def _local_url_allowed(url: str) -> bool:
    """Allow only localhost/private addresses for local model checks."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    if host in {"localhost", "localhost.localdomain"}:
        return True
    try:
        addresses = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False
    return all(
        ipaddress.ip_address(item[4][0]).is_loopback
        or ipaddress.ip_address(item[4][0]).is_private
        for item in addresses
    )


@ai_connections_bp.route("", methods=["GET"])
def list_connections():
    """List all AI connections (secrets redacted)."""
    db = _get_db()
    try:
        rows = db.fetchall("SELECT * FROM ki_verbindungen ORDER BY erstellt_am DESC")
        return jsonify([_redact_row(r) for r in rows])
    finally:
        db.disconnect()


@ai_connections_bp.route("/<int:conn_id>", methods=["GET"])
def get_connection(conn_id: int):
    """Get a single AI connection (secret redacted)."""
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM ki_verbindungen WHERE id = ?", (conn_id,))
        if not row:
            return jsonify({"error": "Connection not found"}), 404
        return jsonify(_redact_row(row))
    finally:
        db.disconnect()


@ai_connections_bp.route("", methods=["POST"])
def create_connection():
    """Create a new AI connection."""
    data = request.get_json(silent=True) or {}
    cleaned, error = _validate_connection(data)
    if error:
        return jsonify({"error": error}), 400

    db = _get_db()
    try:
        cursor = db.execute(
            """INSERT INTO ki_verbindungen (name, provider, kategorie, model_name, base_url, region, endpoint, secret_ref, aktiv, metadata_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cleaned["name"], cleaned["provider"], cleaned["kategorie"],
             cleaned["model_name"], cleaned["base_url"], cleaned["region"],
             cleaned["endpoint"], cleaned["secret_ref"], cleaned["aktiv"],
             cleaned["metadata_json"]),
        )
        new_id = cursor.lastrowid
        row = db.fetchone("SELECT * FROM ki_verbindungen WHERE id = ?", (new_id,))
        return jsonify(_redact_row(row)), 201
    finally:
        db.disconnect()


@ai_connections_bp.route("/<int:conn_id>", methods=["PUT"])
def update_connection(conn_id: int):
    """Update an existing AI connection."""
    db = _get_db()
    try:
        existing = db.fetchone("SELECT * FROM ki_verbindungen WHERE id = ?", (conn_id,))
        if not existing:
            return jsonify({"error": "Connection not found"}), 404

        data = request.get_json(silent=True) or {}
        # Merge: keep existing secret_ref if not explicitly changed
        if "secret_ref" not in data or data["secret_ref"] is None:
            data["secret_ref"] = existing["secret_ref"]

        cleaned, error = _validate_connection(data)
        if error:
            return jsonify({"error": error}), 400

        db.execute(
            """UPDATE ki_verbindungen SET name=?, provider=?, kategorie=?, model_name=?,
               base_url=?, region=?, endpoint=?, secret_ref=?, aktiv=?, metadata_json=?,
               aktualisiert_am=datetime('now') WHERE id=?""",
            (cleaned["name"], cleaned["provider"], cleaned["kategorie"],
             cleaned["model_name"], cleaned["base_url"], cleaned["region"],
             cleaned["endpoint"], cleaned["secret_ref"], cleaned["aktiv"],
             cleaned["metadata_json"], conn_id),
        )
        row = db.fetchone("SELECT * FROM ki_verbindungen WHERE id = ?", (conn_id,))
        return jsonify(_redact_row(row))
    finally:
        db.disconnect()


@ai_connections_bp.route("/<int:conn_id>", methods=["DELETE"])
def delete_connection(conn_id: int):
    """Delete an AI connection."""
    db = _get_db()
    try:
        existing = db.fetchone("SELECT * FROM ki_verbindungen WHERE id = ?", (conn_id,))
        if not existing:
            return jsonify({"error": "Connection not found"}), 404
        db.execute("DELETE FROM ki_verbindungen WHERE id = ?", (conn_id,))
        return jsonify({"status": "deleted", "id": conn_id})
    finally:
        db.disconnect()


@ai_connections_bp.route("/<int:conn_id>/test", methods=["POST"])
def test_connection(conn_id: int):
    """Test connectivity to the configured AI provider endpoint.

    Only tests reachability for configured endpoints. Does NOT make real
    inference calls. Returns honest status/error messages.
    """
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM ki_verbindungen WHERE id = ?", (conn_id,))
        if not row:
            return jsonify({"error": "Connection not found"}), 404

        provider = row["provider"]
        base_url = row["base_url"]
        endpoint = row["endpoint"]
        region = row["region"]
        secret_ref = row["secret_ref"]
        aktiv = row["aktiv"]

        if not aktiv:
            return jsonify({"status": "inactive", "message": "Connection is deactivated"}), 200

        # Provider-specific test logic
        if provider in ("ollama", "llama_cpp"):
            if not base_url:
                return jsonify({"status": "error", "message": "No base_url configured"}), 200
            if not _local_url_allowed(base_url):
                return jsonify({"status": "error", "message": "Local provider URL must resolve to localhost or a private/loopback address"}), 200
            test_url = base_url.rstrip("/")
            if provider == "ollama":
                test_url += "/api/tags"
            else:
                test_url += "/health"
            try:
                req = urllib.request.Request(test_url, method="GET")
                with urllib.request.urlopen(req, timeout=5) as resp:
                    return jsonify({"status": "ok", "message": f"Reachable (HTTP {resp.status})"}), 200
            except urllib.error.HTTPError as e:
                return jsonify({"status": "error", "message": f"HTTP {e.code}: {e.reason}"}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": f"Unreachable: {str(e)[:200]}"}), 200

        elif provider == "bedrock":
            if not region:
                return jsonify({"status": "error", "message": "No region configured"}), 200
            if not secret_ref:
                return jsonify({"status": "error", "message": "No credentials reference configured (secret_ref)"}), 200
            return jsonify({
                "status": "unsupported",
                "message": "Bedrock is configured, but no real AWS SDK connectivity test is available in this deployment."
            }), 200

        elif provider in ("copilot", "openai", "claude", "gemini", "openrouter"):
            if not secret_ref:
                return jsonify({"status": "error", "message": "No API key reference configured (secret_ref)"}), 200
            return jsonify({
                "status": "unsupported",
                "message": "Cloud credentials are configured, but a provider SDK/API-specific connectivity test is not available in this deployment."
            }), 200

        return jsonify({"status": "error", "message": f"Unknown provider: {provider}"}), 200
    finally:
        db.disconnect()
