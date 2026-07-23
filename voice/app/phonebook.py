"""Persistent phonebook with per-contact notes.

Identifies callers by their phone number, provides their notes to the assistant
during the call, and lets the assistant append the most important new
information after each conversation.

The runtime file (``PHONEBOOK_PATH``) is created from a seed file on first use
and is then updated in place, so enrichment persists across calls and restarts.
This is a simple JSON store (no database) in keeping with the project's scope.
"""

from __future__ import annotations

import json
import re
import shutil
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, TypedDict

from .logging_config import get_logger

logger = get_logger("phonebook")


class Contact(TypedDict):
    number: str
    name: str
    notes: list[str]


def normalize_number(raw: str) -> str:
    """Normalise a phone number for reliable matching.

    Keeps a single leading ``+`` and digits only; converts a leading ``00``
    international prefix to ``+``. E.g. ``"+49 160 5483290"`` -> ``"+491605483290"``.
    """
    if not raw:
        return ""
    cleaned = re.sub(r"[^\d+]", "", raw)
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    # Drop any stray '+' that is not the leading character.
    if cleaned.startswith("+"):
        cleaned = "+" + cleaned[1:].replace("+", "")
    else:
        cleaned = cleaned.replace("+", "")
    return cleaned


class Phonebook:
    """Thread-safe JSON-backed phonebook."""

    def __init__(self, path: str, seed_path: Optional[str] = None) -> None:
        self._path = Path(path)
        self._seed_path = Path(seed_path) if seed_path else None
        self._lock = threading.Lock()
        self._contacts: list[Contact] = []
        self._load()

    def _load(self) -> None:
        # Seed the runtime file from the seed on first use.
        if not self._path.exists() and self._seed_path and self._seed_path.exists():
            self._path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(self._seed_path, self._path)
            logger.info("Phonebook seeded from %s.", self._seed_path)

        if self._path.exists():
            try:
                data = json.loads(self._path.read_text(encoding="utf-8"))
                self._contacts = data.get("contacts", [])
                logger.info("Loaded %d contacts from %s.", len(self._contacts), self._path)
            except (json.JSONDecodeError, OSError):
                logger.exception("Failed to read phonebook %s; starting empty.", self._path)
                self._contacts = []
        else:
            logger.warning("No phonebook file at %s; starting empty.", self._path)

    def _save(self) -> None:
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._path.with_suffix(".tmp")
            tmp.write_text(
                json.dumps({"contacts": self._contacts}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            tmp.replace(self._path)
        except OSError:
            logger.exception("Failed to write phonebook %s.", self._path)

    def find(self, number: str) -> Optional[Contact]:
        """Return the contact matching ``number`` (or None)."""
        target = normalize_number(number)
        if not target:
            return None
        with self._lock:
            for contact in self._contacts:
                if normalize_number(contact.get("number", "")) == target:
                    return contact
        return None

    def add_note(self, number: str, note: str) -> bool:
        """Append a dated note to the contact with ``number``. Returns success."""
        note = (note or "").strip()
        if not note:
            return False
        target = normalize_number(number)
        with self._lock:
            for contact in self._contacts:
                if normalize_number(contact.get("number", "")) == target:
                    timestamp = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M")
                    contact.setdefault("notes", []).append(
                        f"{timestamp}: {note}"
                    )
                    self._save()
                    logger.info("Added note to %s: %s", contact.get("name"), note)
                    return True
        logger.warning("Cannot add note: no contact for number %s.", number)
        return False

    def record_call(
        self,
        number: str,
        summary: str,
        ended_at: Optional[datetime] = None,
    ) -> bool:
        """Append a call note, creating a contact for an unknown number."""
        target = normalize_number(number)
        if not target:
            logger.warning("Cannot record call: invalid or empty number %s.", number)
            return False

        timestamp = ended_at or datetime.now().astimezone()
        concise_summary = (summary or "").strip() or "Keine Gesprächsinhalte erfasst."
        note = (
            f"Letzter Anruf am {timestamp.strftime('%d.%m.%Y')} um "
            f"{timestamp.strftime('%H:%M')} Uhr: {concise_summary}"
        )

        with self._lock:
            contact = next(
                (
                    item
                    for item in self._contacts
                    if normalize_number(item.get("number", "")) == target
                ),
                None,
            )
            if contact is None:
                contact = {"number": target, "name": "", "notes": []}
                self._contacts.append(contact)
                logger.info("Created phonebook entry for caller %s.", target)
            contact.setdefault("notes", []).append(note)
            self._save()
            logger.info("Recorded completed call for %s.", target)
            return True


def format_notes(contact: Contact) -> str:
    """Render a contact's notes as a plain bullet list for the prompt."""
    notes = contact.get("notes", [])
    if not notes:
        return "(keine Notizen)"
    return "\n".join(f"- {n}" for n in notes)
