"""SQLite implementation of the DatabaseInterface."""

import logging
import os
import sqlite3
from typing import Any, Optional

from .interface import DatabaseInterface
from .models import CLEAR_ORDER, CREATE_TABLES

logger = logging.getLogger(__name__)


class SQLiteAdapter(DatabaseInterface):
    """SQLite database adapter."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn: Optional[sqlite3.Connection] = None

    def connect(self) -> None:
        """Establish a connection to the SQLite database."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        logger.info("Connected to SQLite database at %s", self.db_path)

    def disconnect(self) -> None:
        """Close the SQLite connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
            logger.info("Disconnected from SQLite database")

    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        """Execute a single write query."""
        assert self.conn is not None, "Database not connected"
        cursor = self.conn.execute(query, params)
        self.conn.commit()
        return cursor

    def insert_returning_id(self, query: str, params: tuple = ()) -> int:
        cursor = self.execute(query, params)
        if cursor.lastrowid is None:
            raise RuntimeError("Insert did not generate an id")
        return int(cursor.lastrowid)

    def executemany(self, query: str, params_list: list[tuple]) -> None:
        """Execute a query with multiple parameter sets."""
        assert self.conn is not None, "Database not connected"
        self.conn.executemany(query, params_list)
        self.conn.commit()

    def fetchall(self, query: str, params: tuple = ()) -> list[dict[str, Any]]:
        """Execute a query and return all rows as list of dicts."""
        assert self.conn is not None, "Database not connected"
        cursor = self.conn.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def fetchone(self, query: str, params: tuple = ()) -> Optional[dict[str, Any]]:
        """Execute a query and return a single row as dict, or None."""
        assert self.conn is not None, "Database not connected"
        cursor = self.conn.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

    def create_tables(self) -> None:
        """Create all application tables."""
        assert self.conn is not None, "Database not connected"
        for sql in CREATE_TABLES:
            self.conn.execute(sql)
        self.conn.commit()
        logger.info("All tables created successfully")

    def clear_tables(self) -> None:
        """Delete all data from all tables in reverse dependency order."""
        assert self.conn is not None, "Database not connected"
        for table in CLEAR_ORDER:
            self.conn.execute(f"DELETE FROM {table}")
            logger.debug("Cleared table: %s", table)
        self.conn.commit()
        logger.info("All tables cleared")
