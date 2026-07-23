"""Tests for the persistent Hermes job storage schema."""

import tempfile
from pathlib import Path

from backend.api.routes import _ensure_hermes_jobs_table
from backend.db.sqlite_adapter import SQLiteAdapter


def test_hermes_job_storage_is_shared_and_persistent():
    with tempfile.TemporaryDirectory() as temp_dir:
        database_path = str(Path(temp_dir) / "jobs.db")
        writer = SQLiteAdapter(database_path)
        writer.connect()
        _ensure_hermes_jobs_table(writer)
        writer.execute(
            "INSERT INTO hermes_jobs (id, status, phase) VALUES (?, ?, ?)",
            ("job-1", "queued", "Gestartet"),
        )
        writer.disconnect()

        reader = SQLiteAdapter(database_path)
        reader.connect()
        row = reader.fetchone("SELECT * FROM hermes_jobs WHERE id = ?", ("job-1",))
        reader.disconnect()

        assert row["status"] == "queued"
        assert row["phase"] == "Gestartet"
