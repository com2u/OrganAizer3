"""Regression tests for meeting participant persistence."""

import tempfile
import unittest
from pathlib import Path

from backend.api.resources_routes import _replace_teilnehmer, _termin_with_intervall
from backend.db.sqlite_adapter import SQLiteAdapter


class TerminTeilnehmerTests(unittest.TestCase):
    def test_participants_are_replaced_and_returned_with_meeting(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db = SQLiteAdapter(str(Path(temp_dir) / "resources.db"))
            db.connect()
            db.create_tables()
            db.execute("INSERT INTO bereiche (gruppe, bereich) VALUES (?, ?)", ("A", "Bereich A"))
            db.execute(
                "INSERT INTO usergruppen (nummer, bereich, bezeichnung) VALUES (?, ?, ?)",
                ("A1", "A", "Benutzer A1"),
            )
            db.execute("INSERT INTO intervalle (kuerzel, bedeutung) VALUES (?, ?)", ("W", "Wöchentlich"))
            db.execute(
                "INSERT INTO termine (bespr_nr, bezeichnung, intervall, dauer_min) VALUES (?, ?, ?, ?)",
                (1, "Termin", "W", 30),
            )
            _replace_teilnehmer(db, 1, ["A1"])
            self.assertEqual(_termin_with_intervall(db, 1)["teilnehmer"], ["A1"])
            _replace_teilnehmer(db, 1, [])
            self.assertEqual(_termin_with_intervall(db, 1)["teilnehmer"], [])
            db.disconnect()


if __name__ == "__main__":
    unittest.main()
