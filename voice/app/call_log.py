"""Call/dialog log writer for the voice agent.

Writes to the very same JSON file the OrganAIzer backend reads for the
*Telefonie -> Telefonate* tab (``data/telephony_calls.json``), so every phone
conversation the agent handles shows up in the UI with its transcript and the
notes the assistant records at the end of the call.

The schema mirrors ``backend/telephony/call_log.py`` exactly::

    {"seq": N, "calls": [{id, direction, remote_number, status, started_at,
                          ended_at, duration_seconds, summary,
                          dialog: [{id, call_id, role, content, timestamp,
                                    status}]}]}
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path

from .logging_config import get_logger

logger = get_logger("call_log")

# /app/data/telephony_calls.json (shared volume with the OrganAIzer backend).
_CALLS_PATH = str(Path(__file__).resolve().parent.parent / "data" / "telephony_calls.json")

_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> dict:
    if not os.path.exists(_CALLS_PATH):
        return {"seq": 0, "calls": []}
    try:
        with open(_CALLS_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        data.setdefault("seq", 0)
        data.setdefault("calls", [])
        return data
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to read call log; starting empty.")
        return {"seq": 0, "calls": []}


def _save(data: dict) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(_CALLS_PATH)), exist_ok=True)
    dir_name = os.path.dirname(os.path.abspath(_CALLS_PATH))
    fd, tmp = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, _CALLS_PATH)
    except OSError:
        logger.exception("Failed to write call log.")
        try:
            os.unlink(tmp)
        except OSError:
            pass


def create_call(direction: str, remote_number: str, status: str = "active") -> int | None:
    """Create a new call entry and return its id (or None on failure)."""
    try:
        with _lock:
            data = _load()
            data["seq"] += 1
            call_id = data["seq"]
            data["calls"].append(
                {
                    "id": call_id,
                    "direction": direction,
                    "remote_number": remote_number or "",
                    "status": status,
                    "started_at": _now(),
                    "ended_at": None,
                    "duration_seconds": None,
                    "summary": None,
                    "dialog": [],
                }
            )
            _save(data)
        return call_id
    except Exception:  # noqa: BLE001 - logging must never break a call
        logger.exception("create_call failed")
        return None


def add_dialog(call_id: int | None, role: str, content: str, status: str = "ok") -> None:
    """Append a dialog turn (user/assistant/system) to a call."""
    if call_id is None or not content:
        return
    try:
        with _lock:
            data = _load()
            for call in data["calls"]:
                if call["id"] == call_id:
                    call.setdefault("dialog", []).append(
                        {
                            "id": len(call["dialog"]) + 1,
                            "call_id": call_id,
                            "role": role,
                            "content": content,
                            "timestamp": _now(),
                            "status": status,
                        }
                    )
                    _save(data)
                    return
    except Exception:  # noqa: BLE001
        logger.exception("add_dialog failed")


def end_call(call_id: int | None, summary: str | None = None) -> None:
    """Mark a call ended, compute its duration and store the summary note."""
    if call_id is None:
        return
    try:
        with _lock:
            data = _load()
            for call in data["calls"]:
                if call["id"] == call_id:
                    if call.get("ended_at") is None:
                        call["ended_at"] = _now()
                        try:
                            start = datetime.fromisoformat(call["started_at"])
                            end = datetime.fromisoformat(call["ended_at"])
                            call["duration_seconds"] = int((end - start).total_seconds())
                        except (ValueError, TypeError):
                            call["duration_seconds"] = None
                    call["status"] = "ended"
                    if summary:
                        call["summary"] = summary
                    _save(data)
                    return
    except Exception:  # noqa: BLE001
        logger.exception("end_call failed")
