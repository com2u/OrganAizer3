"""Mint short-lived LiveKit access tokens for the browser Dialog client.

A LiveKit access token is a plain JWT (HS256) signed with the LiveKit API
secret, carrying a ``video`` grant. We generate it locally with PyJWT so the
control plane never has to reach the voice stack just to hand a browser a token.
The browser then connects to the public LiveKit URL and joins the shared web
room that the agent worker watches.
"""

from __future__ import annotations

import time
import uuid
from urllib.parse import urlparse

import jwt

from . import config_store


def _browser_url(configured_url: str, request_origin: str = "") -> str:
    """Return a browser-reachable ws(s) URL, never a server-local address."""
    configured = configured_url.strip()
    parsed = urlparse(configured)
    local_hosts = {"", "localhost", "127.0.0.1", "::1"}
    if parsed.scheme in {"ws", "wss"} and (parsed.hostname or "") not in local_hosts:
        return configured.rstrip("/")

    origin = urlparse(request_origin.strip())
    if origin.hostname and origin.hostname not in local_hosts:
        scheme = "wss" if origin.scheme == "https" else "ws"
        return f"{scheme}://{origin.netloc}".rstrip("/")

    if configured:
        raise RuntimeError(
            "LiveKit public URL points to localhost and cannot be reached by the browser."
        )
    raise RuntimeError("LiveKit public URL is not configured.")


def issue_web_token(ttl_seconds: int = 900, request_origin: str = "") -> dict:
    """Return ``{token, url, room, identity}`` for the web Dialog client.

    Raises ``RuntimeError`` if LiveKit is not configured yet.
    """
    api_key = config_store.get_value("livekit_api_key").strip()
    api_secret = config_store.get_value("livekit_api_secret").strip()
    room = config_store.get_value("web_room_name").strip() or "organaizer-web"
    configured_public_url = (
        config_store.get_value("livekit_public_url").strip()
        or config_store.get_value("livekit_url").strip()
    )

    if not api_key or not api_secret:
        raise RuntimeError("LiveKit is not configured (missing API key/secret).")
    public_url = _browser_url(configured_public_url, request_origin)

    identity = f"web-user-{uuid.uuid4().hex[:8]}"
    now = int(time.time())
    claims = {
        "iss": api_key,
        "sub": identity,
        "name": "Web Caller",
        "nbf": now - 5,
        "exp": now + ttl_seconds,
        "video": {
            "room": room,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }
    token = jwt.encode(claims, api_secret, algorithm="HS256")
    # PyJWT<2 returns bytes; normalise to str.
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return {
        "token": token,
        "url": public_url,
        "room": room,
        "identity": identity,
    }
