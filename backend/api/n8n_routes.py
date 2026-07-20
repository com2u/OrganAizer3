"""REST API routes for n8n integration.

Manages the connection settings for the local n8n instance and provides
a proxy endpoint to test connectivity. The n8n UI is embedded in the
frontend via an iframe pointing to the configured base_url.
"""

import logging
import re
import urllib.request
import urllib.error

from flask import Blueprint, jsonify, request

from backend import auth
from backend.config import DB_PATH
from backend.db.sqlite_adapter import SQLiteAdapter

logger = logging.getLogger(__name__)

n8n_bp = Blueprint("n8n", __name__)


@n8n_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


_URL_RE = re.compile(r"^https?://[^\s]+$", re.IGNORECASE)


def _get_db() -> SQLiteAdapter:
    db = SQLiteAdapter(DB_PATH)
    db.connect()
    return db


def _ensure_singleton():
    """Insert the default config row if it does not exist yet."""
    db = _get_db()
    try:
        row = db.fetchone("SELECT id FROM n8n_config WHERE id = 1")
        if not row:
            db.execute(
                "INSERT INTO n8n_config (id, base_url) VALUES (1, 'http://localhost:5678')"
            )
    finally:
        db.disconnect()


def _redact_row(row: dict) -> dict:
    """Return config with api_key redacted (replaced by has_api_key boolean)."""
    out = dict(row)
    has_key = bool(out.pop("api_key", None))
    out["api_key_configured"] = has_key
    return out


@n8n_bp.route("/config", methods=["GET"])
def get_config():
    """Get the n8n connection configuration (api_key redacted)."""
    _ensure_singleton()
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM n8n_config WHERE id = 1")
        if not row:
            return jsonify({"error": "n8n config not found"}), 500
        return jsonify(_redact_row(row))  # type: ignore[arg-type]
    finally:
        db.disconnect()


@n8n_bp.route("/config", methods=["PUT"])
def update_config():
    """Update the n8n connection configuration."""
    _ensure_singleton()
    db = _get_db()
    try:
        data = request.get_json(silent=True) or {}

        base_url = (data.get("base_url") or "").strip()
        webhook_url = (data.get("webhook_url") or "").strip() or None
        aktiv = 1 if data.get("aktiv", True) else 0

        # api_key: only update if explicitly provided (non-null, non-empty)
        api_key = data.get("api_key")
        update_api_key = api_key is not None and api_key != ""

        if not base_url:
            return jsonify({"error": "base_url is required"}), 400
        if not _URL_RE.match(base_url):
            return jsonify({"error": "base_url must be a valid http/https URL"}), 400
        if webhook_url and not _URL_RE.match(webhook_url):
            return jsonify({"error": "webhook_url must be a valid http/https URL"}), 400

        if update_api_key:
            db.execute(
                """UPDATE n8n_config SET base_url=?, api_key=?, webhook_url=?, aktiv=?,
                   aktualisiert_am=datetime('now') WHERE id=1""",
                (base_url, api_key, webhook_url, aktiv),
            )
        else:
            db.execute(
                """UPDATE n8n_config SET base_url=?, webhook_url=?, aktiv=?,
                   aktualisiert_am=datetime('now') WHERE id=1""",
                (base_url, webhook_url, aktiv),
            )

        row = db.fetchone("SELECT * FROM n8n_config WHERE id = 1")
        return jsonify(_redact_row(row))  # type: ignore[arg-type]
    finally:
        db.disconnect()


@n8n_bp.route("/test", methods=["POST"])
def test_connection():
    """Test connectivity to the configured n8n instance.

    The configured base_url is typically http://localhost:5678 (for browser
    iframe access). Since the backend runs inside a Docker container, we also
    try the Docker-internal hostname 'n8n:5678' as a fallback.
    """
    _ensure_singleton()
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM n8n_config WHERE id = 1")
        if not row:
            return jsonify({"status": "error", "message": "n8n config not found"}), 200

        base_url = row["base_url"]
        aktiv = row["aktiv"]

        if not aktiv:
            return jsonify({"status": "inactive", "message": "n8n connection is deactivated"}), 200

        if not base_url:
            return jsonify({"status": "error", "message": "No base_url configured"}), 200

        # Build list of URLs to try: the configured one, plus Docker-internal fallback
        urls_to_try = [base_url.rstrip("/")]
        # If base_url uses localhost, also try the Docker service name 'n8n'
        if "localhost" in base_url or "127.0.0.1" in base_url:
            docker_url = base_url.replace("localhost", "n8n").replace("127.0.0.1", "n8n").rstrip("/")
            if docker_url not in urls_to_try:
                urls_to_try.append(docker_url)

        for test_base in urls_to_try:
            test_url = test_base + "/healthz"
            try:
                req = urllib.request.Request(test_url, method="GET")
                with urllib.request.urlopen(req, timeout=5) as resp:
                    return jsonify({"status": "ok", "message": f"Reachable at {test_base} (HTTP {resp.status})"}), 200
            except urllib.error.HTTPError as e:
                # n8n may return 401/403/404 for healthz, but that means it's running
                if e.code in (401, 403, 404):
                    return jsonify({"status": "ok", "message": f"Reachable at {test_base} (HTTP {e.code} – n8n is running)"}), 200
            except Exception:
                # Try root URL as fallback
                try:
                    req2 = urllib.request.Request(test_base, method="GET")
                    with urllib.request.urlopen(req2, timeout=5) as resp2:
                        return jsonify({"status": "ok", "message": f"Reachable at {test_base} (HTTP {resp2.status})"}), 200
                except Exception:
                    continue

        return jsonify({"status": "error", "message": f"Unreachable: tried {', '.join(urls_to_try)}"}), 200
    finally:
        db.disconnect()


@n8n_bp.route("/workflows", methods=["GET"])
def list_workflows():
    """List workflows from the local n8n instance via its REST API.

    Requires an API key to be configured. Uses n8n's internal API at
    /api/v1/workflows.
    """
    _ensure_singleton()
    db = _get_db()
    try:
        row = db.fetchone("SELECT * FROM n8n_config WHERE id = 1")
        if not row:
            return jsonify({"error": "n8n config not found"}), 500

        api_key = row["api_key"]
        base_url = row["base_url"]

        if not api_key:
            return jsonify({"error": "No API key configured. Set the API key in n8n settings first."}), 400

        # Try configured URL, plus Docker-internal fallback if localhost
        urls_to_try = [base_url.rstrip("/")]
        if "localhost" in base_url or "127.0.0.1" in base_url:
            docker_url = base_url.replace("localhost", "n8n").replace("127.0.0.1", "n8n").rstrip("/")
            if docker_url not in urls_to_try:
                urls_to_try.append(docker_url)

        last_error = None
        for api_base in urls_to_try:
            url = api_base + "/api/v1/workflows"
            try:
                req = urllib.request.Request(url, method="GET")
                req.add_header("X-N8N-API-KEY", api_key)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    import json
                    data = json.loads(resp.read().decode("utf-8"))
                    workflows = data.get("data", [])
                    return jsonify({"workflows": [
                        {
                            "id": w.get("id"),
                            "name": w.get("name"),
                            "active": w.get("active", False),
                            "tags": w.get("tags", []),
                        }
                        for w in workflows
                    ]})
            except urllib.error.HTTPError as e:
                last_error = f"n8n API error: HTTP {e.code}: {e.reason}"
                # If we get an HTTP error (not connection refused), the host is reachable
                # so we can stop trying other URLs
                return jsonify({"error": last_error}), 502
            except Exception as e:
                last_error = f"Cannot reach n8n at {api_base}: {str(e)[:200]}"
                continue

        return jsonify({"error": last_error or "Cannot reach n8n"}), 502
    finally:
        db.disconnect()
