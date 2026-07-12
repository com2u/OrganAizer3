"""Authentication against OpenWebUI.

OpenWebUI is used as the shared identity backend: user accounts are managed in
OpenWebUI, and the OrganAIzer app authenticates against its REST API.

- Login: POST {OPENWEBUI_URL}/api/v1/auths/signin  -> returns a JWT token
- Validate: GET {OPENWEBUI_URL}/api/v1/auths/ with Bearer token -> current user
"""

import json
import logging
import time
import urllib.error
import urllib.request

from flask import g, jsonify, request

from backend.config import AUTH_ENABLED, OPENWEBUI_URL

logger = logging.getLogger(__name__)

# Simple in-memory cache: token -> (expiry_ts, user_dict)
_TOKEN_CACHE: dict[str, tuple[float, dict]] = {}
_CACHE_TTL = 300  # seconds
_HTTP_TIMEOUT = 15


def _post_json(url: str, payload: dict, headers: dict | None = None):
    data = json.dumps(payload).encode()
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST")
    with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
        return resp.status, json.loads(resp.read().decode() or "{}")


def _get_json(url: str, headers: dict | None = None):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
        return resp.status, json.loads(resp.read().decode() or "{}")


def signin(email: str, password: str) -> dict | None:
    """Authenticate credentials against OpenWebUI.

    Returns the OpenWebUI user payload (including ``token``) on success,
    ``None`` on invalid credentials. Raises on connectivity problems.
    """
    url = f"{OPENWEBUI_URL}/api/v1/auths/signin"
    try:
        status, data = _post_json(url, {"email": email, "password": password})
    except urllib.error.HTTPError:
        # 400/401 -> invalid credentials
        return None
    if status == 200 and data.get("token"):
        return data
    return None


def validate_token(token: str) -> dict | None:
    """Validate a token against OpenWebUI (with short-lived caching)."""
    now = time.time()
    cached = _TOKEN_CACHE.get(token)
    if cached and cached[0] > now:
        return cached[1]

    url = f"{OPENWEBUI_URL}/api/v1/auths/"
    try:
        status, data = _get_json(url, headers={"Authorization": f"Bearer {token}"})
    except urllib.error.HTTPError:
        return None
    except Exception:
        logger.exception("OpenWebUI token validation failed")
        return None

    if status == 200 and data.get("email"):
        _TOKEN_CACHE[token] = (now + _CACHE_TTL, data)
        return data
    return None


def _extract_token() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip() or None
    return None


# Paths (relative to the /api blueprint) reachable without authentication
_PUBLIC_SUFFIXES = ("/auth/login",)


def enforce_auth():
    """Blueprint ``before_request`` guard: require a valid token on /api."""
    if not AUTH_ENABLED:
        return None
    if request.method == "OPTIONS":
        return None
    if any(request.path.endswith(s) for s in _PUBLIC_SUFFIXES):
        return None

    token = _extract_token()
    if not token:
        return jsonify({"error": "Authentication required"}), 401
    user = validate_token(token)
    if not user:
        return jsonify({"error": "Invalid or expired session"}), 401
    g.user = user
    return None


def public_user(user: dict) -> dict:
    """Return a safe subset of the OpenWebUI user for the frontend."""
    return {
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role"),
        "profile_image_url": user.get("profile_image_url"),
    }
