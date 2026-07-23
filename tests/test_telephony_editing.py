"""Regression tests for editable telephony history and phonebook email."""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.telephony import call_log, phonebook_store


class TelephonyEditingTests(unittest.TestCase):
    def test_single_call_can_be_deleted_without_touching_others(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = str(Path(temp_dir) / "calls.json")
            with patch.object(call_log, "TELEPHONY_CALLS_PATH", path):
                first = call_log.create_call("inbound", "+491")
                second = call_log.create_call("outbound", "+492")
                self.assertTrue(call_log.delete_call(first["id"]))
                self.assertFalse(call_log.delete_call(9999))
                self.assertEqual([item["id"] for item in call_log.list_calls()], [second["id"]])

    def test_phonebook_email_is_saved_and_existing_notes_are_preserved(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = str(Path(temp_dir) / "phonebook.json")
            seed = str(Path(temp_dir) / "missing-seed.json")
            with patch.object(phonebook_store, "PHONEBOOK_PATH", path), \
                 patch.object(phonebook_store, "PHONEBOOK_SEED_PATH", seed):
                saved = phonebook_store.save_contact({
                    "number": "+49 123",
                    "name": "Test",
                    "email": "test@example.org",
                    "notes": ["Bestehende Notiz"],
                })
                self.assertEqual(saved["email"], "test@example.org")
                persisted = json.loads(Path(path).read_text(encoding="utf-8"))
                self.assertEqual(persisted["contacts"][0]["notes"], ["Bestehende Notiz"])


if __name__ == "__main__":
    unittest.main()
