"""Thin HTTP client to the local voice service (voice-web control endpoints).

The heavy telephony machinery (LiveKit, SIP) runs in the voice-stack containers
on the host network. The Flask control plane talks to the voice service's small
control API over HTTP for actions that require the LiveKit server API:

- ``POST /api/outbound``  place an outbound PSTN call (dial via Twilio trunk)
- ``GET  /api/status``    stack health / configured trunk info

The base URL is configurable (``VOICE_SERVICE_URL``). From the bridge-networked
control container the host-networked voice service is reached via
``host.docker.internal`` (added as an extra host in docker-compose).
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from backend.config import VOICE_SERVICE_URL

logger = logging.getLogger(__name__)

_TIMEOUT = 20


class VoiceServiceError(RuntimeError):
    """Raised when the voice service cannot fulfil a request."""


def _request(method: str, path: str, payload: dict | None = None) -> dict:
    url = f"{VOICE_SERVICE_URL.rstrip('/')}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            body = resp.read().decode() or "{}"
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode() or "{}").get("error", "")
        except Exception:  # noqa: BLE001
            pass
        raise VoiceServiceError(detail or f"Voice service error ({exc.code}).") from exc
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
        raise VoiceServiceError(
            "Voice service is not reachable. Is the telephony stack running?"
        ) from exc


def place_outbound_call(number: str, call_id: int | None = None) -> dict:
    """Ask the voice service to dial ``number`` and connect the AI agent.

    ``call_id`` is the Telefonate log entry id; the voice service embeds it in
    the room name so the agent attaches the transcript/summary to that entry.
    """
    payload: dict = {"number": number}
    if call_id is not None:
        payload["call_id"] = call_id
    return _request("POST", "/api/outbound", payload)


def hangup(room: str) -> dict:
    return _request("POST", "/api/hangup", {"room": room})


def status() -> dict:
    """Return voice-stack status, or a degraded payload if unreachable."""
    try:
        return {"reachable": True, **_request("GET", "/api/status")}
    except VoiceServiceError as exc:
        return {"reachable": False, "error": str(exc)}
