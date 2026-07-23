"""Central database selection for SQLite fallback and Supabase PostgreSQL."""

import os

from backend.config import DB_PATH
from .interface import DatabaseInterface


def get_database() -> DatabaseInterface:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if database_url:
        from .postgres_adapter import PostgresAdapter

        return PostgresAdapter(database_url)

    from .sqlite_adapter import SQLiteAdapter

    return SQLiteAdapter(DB_PATH)


def integrity_errors() -> tuple[type[BaseException], ...]:
    """Constraint violations supported by the active database driver."""
    import sqlite3

    errors: list[type[BaseException]] = [sqlite3.IntegrityError]
    try:
        import psycopg

        errors.append(psycopg.IntegrityError)
    except ImportError:
        pass
    return tuple(errors)
