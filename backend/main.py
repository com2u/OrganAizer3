"""CLI entry point for Terminlandschaft import/export.

Usage:
    python -m backend.main import schedule.xlsx
    python -m backend.main export output.xlsx
"""

import sys

from backend.config import setup_logging
from backend.db.factory import get_database
from backend.services.import_service import import_excel


def main() -> None:
    setup_logging()

    if len(sys.argv) < 3:
        print("Usage:")
        print("  python -m backend.main import <excel_file>")
        print("  python -m backend.main export <output_file>")
        sys.exit(1)

    command = sys.argv[1]
    filepath = sys.argv[2]

    db = get_database()
    db.connect()

    try:
        db.create_tables()

        if command == "import":
            import_excel(db, filepath)
        elif command == "export":
            from backend.services.export_service import export_excel

            export_excel(db, filepath)
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
    finally:
        db.disconnect()


if __name__ == "__main__":
    main()
