"""Health bridge for the local HyperFrames renderer."""

import requests
from flask import Blueprint, jsonify

from backend import auth
from backend.integration_config import read_config

hyperframes_bp = Blueprint("hyperframes", __name__)


@hyperframes_bp.before_request
def _auth():
    return auth.enforce_auth()


@hyperframes_bp.get("/status")
def status():
    config = read_config("hyperframes")
    internal_url = str(config.get("renderer_url") or "http://hyperframes:3002").rstrip("/")
    try:
        response = requests.get(internal_url, timeout=4)
        return jsonify({"available": response.ok, "version": "0.7.70"}), 200
    except requests.RequestException:
        return jsonify({"available": False, "version": "0.7.70"}), 200
