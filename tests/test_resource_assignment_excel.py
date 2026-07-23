"""Roundtrip and validation tests for extended resource assignments."""

import tempfile
import unittest
from pathlib import Path

import openpyxl

from backend.db.sqlite_adapter import SQLiteAdapter
from backend.services.export_service import export_excel
from backend.services.import_service import import_excel, validate_excel


class ResourceAssignmentExcelTests(unittest.TestCase):
    def test_extended_assignments_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = SQLiteAdapter(str(Path(temp_dir) / "source.db"))
            source.connect()
            source.create_tables()
            source.execute("INSERT INTO bereiche (gruppe, bereich) VALUES (?, ?)", ("A", "Bereich A"))
            source.execute("INSERT INTO usergruppen (nummer, bereich, bezeichnung) VALUES (?, ?, ?)", ("A1", "A", "Gruppe A1"))
            source.execute("INSERT INTO intervalle (kuerzel, bedeutung) VALUES (?, ?)", ("W", "Wöchentlich"))
            source.execute("INSERT INTO termine (bespr_nr, bezeichnung, intervall, dauer_min) VALUES (?, ?, ?, ?)", (1, "Termin", "W", 30))
            source.execute("INSERT INTO personen (vorname, nachname, standort) VALUES (?, ?, ?)", ("Ada", "Lovelace", "Berlin"))
            source.execute("INSERT INTO rollen (bezeichnung) VALUES (?)", ("Leitung",))
            source.execute("INSERT INTO raeume (bezeichnung) VALUES (?)", ("Raum 1",))
            source.execute("INSERT INTO komponenten (bezeichnung) VALUES (?)", ("Beamer",))
            source.execute("INSERT INTO termin_teilnehmer VALUES (?, ?)", (1, "A1"))
            source.execute("INSERT INTO person_rollen VALUES (?, ?)", (1, 1))
            source.execute("INSERT INTO rolle_gruppen VALUES (?, ?)", (1, "A1"))
            source.execute("INSERT INTO termin_raeume VALUES (?, ?)", (1, 1))
            source.execute("INSERT INTO termin_komponenten VALUES (?, ?)", (1, 1))
            export_path = str(Path(temp_dir) / "export.xlsx")
            export_excel(source, export_path)
            source.disconnect()

            self.assertEqual(validate_excel(export_path), [])
            target = SQLiteAdapter(str(Path(temp_dir) / "target.db"))
            target.connect()
            target.create_tables()
            import_excel(target, export_path)
            self.assertEqual(target.fetchone("SELECT standort FROM personen WHERE id = 1")["standort"], "Berlin")
            self.assertIsNotNone(target.fetchone("SELECT * FROM rolle_gruppen"))
            self.assertIsNotNone(target.fetchone("SELECT * FROM termin_raeume"))
            self.assertIsNotNone(target.fetchone("SELECT * FROM termin_komponenten"))
            target.disconnect()

    def test_missing_reference_is_reported_before_import(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = str(Path(temp_dir) / "invalid.xlsx")
            workbook = openpyxl.Workbook()
            workbook.remove(workbook.active)
            for name, header in (
                ("Bereiche", ["Gruppe", "Bereich"]),
                ("Usergruppen", ["Bereich", "Nummer", "Bezeichnung", "Name"]),
                ("Intervalle", ["Kürzel", "Bedeutung"]),
                ("Termine", ["Bespr.Nr.", "Bezeichnung", "Intervall", "Dauer", "Teilnehmer"]),
                ("Terminliste", ["Woche", "Tag", "Start", "Ende", "Meeting"]),
            ):
                sheet = workbook.create_sheet(name)
                sheet.append(header)
            workbook["Bereiche"].append(["A", "Bereich A"])
            workbook["Usergruppen"].append(["A", "A1", "Gruppe", ""])
            workbook["Intervalle"].append(["W", "Wöchentlich"])
            workbook["Termine"].append([1, "Termin", "W", 30, "NICHT_DA"])
            workbook.save(path)
            issues = validate_excel(path)
            self.assertTrue(any("NICHT_DA" in issue["message"] for issue in issues))


if __name__ == "__main__":
    unittest.main()
