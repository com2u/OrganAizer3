"""Public route for access requests (Zugangsanfragen).

This Blueprint is intentionally PUBLIC – no authentication is required.
It is mounted under /api/access-requests.

Rate-limiting: a simple in-memory sliding-window limiter (per IP, per minute)
is applied to prevent trivial spam. No IP is stored persistently.

Duplicate handling: if an open request for the same email already exists,
we return a neutral confirmation (HTTP 200) without creating a duplicate.
"""

import logging
import re
import time
from collections import defaultdict

from flask import Blueprint, jsonify, request

from backend.db.factory import get_database, integrity_errors

logger = logging.getLogger(__name__)

access_requests_bp = Blueprint("access_requests", __name__)

# ── Simple in-memory rate limiter ────────────────────────────────────────────
# Stores: ip -> list of request timestamps (last 60 s)
_RATE_WINDOW = 60  # seconds
_RATE_LIMIT = 5    # max requests per IP per window
_ip_windows: dict[str, list[float]] = defaultdict(list)


def _is_rate_limited(ip: str) -> bool:
    now = time.monotonic()
    window = _ip_windows[ip]
    # Remove timestamps outside window
    _ip_windows[ip] = [t for t in window if now - t < _RATE_WINDOW]
    if len(_ip_windows[ip]) >= _RATE_LIMIT:
        return True
    _ip_windows[ip].append(now)
    return False


# ── Validation helpers ────────────────────────────────────────────────────────
_EMAIL_RE = re.compile(r"^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{1,50}$")
MAX_ZUSATZINFOS = 500


def _validate_email(raw: str) -> str | None:
    """Return normalised email or None if invalid."""
    email = raw.strip().lower()
    if not email or len(email) > 200:
        return None
    if not _EMAIL_RE.match(email):
        return None
    return email


# ── Route ─────────────────────────────────────────────────────────────────────

@access_requests_bp.route("", methods=["POST"])
def create_access_request():
    """
    POST /api/access-requests

    Public endpoint – no auth required.

    Request body (JSON):
        email        : string, required, valid e-mail syntax
        zusatzinfos  : string, required, max 500 chars

    Response (200):
        { "request_id": <int>, "status": "open" }

    Duplicate behaviour: if an open request for this email already exists
    the existing request_id is returned without modification (idempotent).
    """
    ip = request.remote_addr or "unknown"
    if _is_rate_limited(ip):
        return jsonify({"error": "Zu viele Anfragen. Bitte warten Sie einen Moment."}), 429

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON-Objekt erforderlich."}), 400

    email = _validate_email(str(body.get("email") or ""))
    if not email:
        return jsonify({"error": "Ungültige E-Mail-Adresse."}), 400

    zusatzinfos = str(body.get("zusatzinfos") or "").strip()
    if not zusatzinfos:
        return jsonify({"error": "Zusatzinformationen sind erforderlich."}), 400
    if len(zusatzinfos) > MAX_ZUSATZINFOS:
        return jsonify({"error": f"Zusatzinformationen dürfen maximal {MAX_ZUSATZINFOS} Zeichen haben."}), 400

    db = get_database()
    db.connect()
    try:
        # Idempotency: return existing open request without creating a duplicate
        existing = db.fetchone(
            "SELECT id, status FROM zugangsanfragen WHERE email = ? AND status = 'open'",
            (email,),
        )
        if existing:
            logger.info("Access request already exists for %s (id=%s)", email, existing["id"])
            return jsonify({"request_id": existing["id"], "status": existing["status"]}), 200

        try:
            request_id = db.insert_returning_id(
                """
                INSERT INTO zugangsanfragen (email, zusatzinfos, status)
                VALUES (?, ?, 'open')
                """,
                (email, zusatzinfos),
            )
        except integrity_errors():
            # A concurrent request may have inserted the same open email
            # after the SELECT above. The partial unique index makes this
            # race safe; return the same neutral response as the fast path.
            existing = db.fetchone(
                "SELECT id, status FROM zugangsanfragen WHERE email = ? AND status = 'open'",
                (email,),
            )
            if existing:
                return jsonify({"request_id": existing["id"], "status": existing["status"]}), 200
            raise
        logger.info("New access request id=%s for email=%s", request_id, email)
        return jsonify({"request_id": request_id, "status": "open"}), 200
    finally:
        db.disconnect()
