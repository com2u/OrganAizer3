"""Health bridge for the local Excalidraw whiteboard."""

import requests
from flask import Blueprint, jsonify

from backend import auth
from backend.integration_config import read_config

excalidraw_bp = Blueprint("excalidraw", __name__)


@excalidraw_bp.before_request
def _auth():
    return auth.enforce_auth()


@excalidraw_bp.get("/status")
def status():
    config = read_config("excalidraw")
    internal_url = str(config.get("app_url") or "http://excalidraw:80").rstrip("/")
    try:
        response = requests.get(internal_url, timeout=4)
        return jsonify({"available": response.ok, "storage": "browser"}), 200
    except requests.RequestException:
        return jsonify({"available": False, "storage": "browser"}), 200
