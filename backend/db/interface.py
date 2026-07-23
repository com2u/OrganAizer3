"""Abstract database interface for the Terminlandschaft application.

Swapping from SQLite to PostgreSQL only requires implementing a new adapter
that inherits from DatabaseInterface.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional


class DatabaseInterface(ABC):
    """Abstract base class defining the database interface."""

    @abstractmethod
    def connect(self) -> None:
        """Establish a connection to the database."""
        ...

    @abstractmethod
    def disconnect(self) -> None:
        """Close the database connection."""
        ...

    @abstractmethod
    def execute(self, query: str, params: tuple = ()) -> Any:
        """Execute a single query (INSERT, UPDATE, DELETE, DDL)."""
        ...

    @abstractmethod
    def insert_returning_id(self, query: str, params: tuple = ()) -> int:
        """Insert one row and return its generated integer primary key."""
        ...

    @abstractmethod
    def executemany(self, query: str, params_list: list[tuple]) -> None:
        """Execute a query with multiple parameter sets."""
        ...

    @abstractmethod
    def fetchall(self, query: str, params: tuple = ()) -> list[dict[str, Any]]:
        """Execute a query and return all rows as list of dicts."""
        ...

    @abstractmethod
    def fetchone(self, query: str, params: tuple = ()) -> Optional[dict[str, Any]]:
        """Execute a query and return a single row as dict, or None."""
        ...

    @abstractmethod
    def create_tables(self) -> None:
        """Create all application tables."""
        ...

    @abstractmethod
    def clear_tables(self) -> None:
        """Delete all data from all tables (respecting FK order)."""
        ...
