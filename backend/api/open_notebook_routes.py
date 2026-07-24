"""Authenticated, server-side bridge to the Open Notebook REST API."""

import logging
import requests
from flask import Blueprint, jsonify, request

from backend import auth
from backend.integration_config import read_config

logger = logging.getLogger(__name__)
open_notebook_bp = Blueprint("open_notebook", __name__)

_TIMEOUT = 12


def _settings():
    cfg = read_config("open_notebook")
    return (
        str(cfg.get("api_url") or "http://open-notebook:5055").rstrip("/"),
        str(cfg.get("public_url") or "https://open-notebook.ai-server.org").rstrip("/"),
        str(cfg.get("password") or ""),
    )


@open_notebook_bp.before_request
def _enforce_auth():
    return auth.enforce_auth()


def _headers() -> dict[str, str]:
    _, _, password = _settings()
    headers = {"Accept": "application/json"}
    if password:
        headers["Authorization"] = f"Bearer {password}"
    return headers


def _forward(method: str, path: str, payload=None):
    base_url, _, _ = _settings()
    try:
        response = requests.request(
            method,
            f"{base_url}{path}",
            headers={**_headers(), **({"Content-Type": "application/json"} if payload is not None else {})},
            json=payload,
            timeout=_TIMEOUT,
        )
        data = response.json() if response.content else {}
        return jsonify(data), response.status_code
    except requests.RequestException as exc:
        logger.warning("Open Notebook is unavailable: %s", exc)
        return jsonify({
            "error": "Open Notebook ist momentan nicht erreichbar.",
            "code": "open_notebook_unavailable",
        }), 503
    except ValueError:
        return jsonify({"error": "Ungültige Antwort von Open Notebook."}), 502


@open_notebook_bp.get("/status")
def status():
    base_url, public_url, _ = _settings()
    try:
        response = requests.get(f"{base_url}/health", headers=_headers(), timeout=4)
        return jsonify({
            "available": response.ok,
            "public_url": public_url,
            "service": response.json() if response.ok else {},
        }), 200
    except (requests.RequestException, ValueError):
        return jsonify({"available": False, "public_url": public_url, "service": {}}), 200


@open_notebook_bp.get("/notebooks")
def list_notebooks():
    return _forward("GET", "/api/notebooks")


@open_notebook_bp.get("/access")
def access():
    """Return the studio password only to an authenticated OrganAIzer user."""
    _, _, password = _settings()
    return jsonify({"configured": bool(password), "password": password})


@open_notebook_bp.post("/notebooks")
def create_notebook():
    body = request.get_json(silent=True) or {}
    name = str(body.get("name", "")).strip()
    if not name:
        return jsonify({"error": "Ein Name ist erforderlich."}), 400
    if len(name) > 160:
        return jsonify({"error": "Der Name darf höchstens 160 Zeichen lang sein."}), 400
    payload = {"name": name, "description": str(body.get("description", "")).strip()[:2000]}
    return _forward("POST", "/api/notebooks", payload)


@open_notebook_bp.delete("/notebooks/<path:notebook_id>")
def delete_notebook(notebook_id: str):
    if not notebook_id.startswith("notebook:"):
        return jsonify({"error": "Ungültige Notebook-ID."}), 400
    return _forward("DELETE", f"/api/notebooks/{notebook_id}")
