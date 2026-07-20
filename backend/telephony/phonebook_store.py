"""Shared phonebook store for the Telefonie -> Telefonate tab.

Reads and writes the same JSON file (``PHONEBOOK_PATH``) that the voice agent
uses, so contacts edited in the UI are immediately available to the phone
assistant and notes the assistant adds after a call show up in the UI.

The on-disk format matches ``voice/app/phonebook.py``::

    {"contacts": [{"number": "+49...", "name": "...", "notes": ["..."]}]}

Numbers are normalised (leading ``+`` and digits only) for reliable matching.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import tempfile
import threading

from backend.config import PHONEBOOK_PATH, PHONEBOOK_SEED_PATH

logger = logging.getLogger(__name__)

_lock = threading.Lock()


def normalize_number(raw: str) -> str:
    """Normalise a phone number: keep a single leading ``+`` and digits only."""
    if not raw:
        return ""
    cleaned = re.sub(r"[^\d+]", "", raw)
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if cleaned.startswith("+"):
        cleaned = "+" + cleaned[1:].replace("+", "")
    else:
        cleaned = cleaned.replace("+", "")
    return cleaned


def _load() -> dict:
    # Seed the runtime file from the seed on first use (mirrors the agent).
    if not os.path.exists(PHONEBOOK_PATH) and os.path.exists(PHONEBOOK_SEED_PATH):
        try:
            os.makedirs(os.path.dirname(os.path.abspath(PHONEBOOK_PATH)), exist_ok=True)
            shutil.copyfile(PHONEBOOK_SEED_PATH, PHONEBOOK_PATH)
            logger.info("Phonebook seeded from %s", PHONEBOOK_SEED_PATH)
        except OSError:
            logger.exception("Failed to seed phonebook from %s", PHONEBOOK_SEED_PATH)

    if not os.path.exists(PHONEBOOK_PATH):
        return {"contacts": []}
    try:
        with open(PHONEBOOK_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            return {"contacts": []}
        data.setdefault("contacts", [])
        return data
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to read phonebook; starting empty.")
        return {"contacts": []}


def _save(data: dict) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(PHONEBOOK_PATH)), exist_ok=True)
    dir_name = os.path.dirname(os.path.abspath(PHONEBOOK_PATH))
    fd, tmp = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, PHONEBOOK_PATH)
    except OSError:
        logger.exception("Failed to write phonebook.")
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _clean_contact(payload: dict) -> dict:
    """Coerce an incoming contact payload into the stored shape."""
    number = normalize_number(str(payload.get("number", "")))
    name = str(payload.get("name", "")).strip()
    raw_notes = payload.get("notes", [])
    notes: list[str] = []
    if isinstance(raw_notes, list):
        notes = [str(n).strip() for n in raw_notes if str(n).strip()]
    elif isinstance(raw_notes, str):
        notes = [line.strip() for line in raw_notes.splitlines() if line.strip()]
    return {"number": number, "name": name, "notes": notes}


def list_contacts() -> list[dict]:
    with _lock:
        data = _load()
    contacts = data.get("contacts", [])
    return sorted(contacts, key=lambda c: str(c.get("name", "")).lower())


def save_contact(payload: dict) -> dict:
    """Create or update a contact (matched by normalised number)."""
    contact = _clean_contact(payload)
    if not contact["number"]:
        raise ValueError("Rufnummer fehlt.")
    original = normalize_number(str(payload.get("original_number", "") or contact["number"]))
    with _lock:
        data = _load()
        contacts = data.setdefault("contacts", [])
        for existing in contacts:
            if normalize_number(existing.get("number", "")) == original:
                existing["number"] = contact["number"]
                existing["name"] = contact["name"]
                existing["notes"] = contact["notes"]
                _save(data)
                return existing
        contacts.append(contact)
        _save(data)
    return contact


def delete_contact(number: str) -> bool:
    target = normalize_number(number)
    with _lock:
        data = _load()
        contacts = data.get("contacts", [])
        remaining = [c for c in contacts if normalize_number(c.get("number", "")) != target]
        if len(remaining) == len(contacts):
            return False
        data["contacts"] = remaining
        _save(data)
    return True
