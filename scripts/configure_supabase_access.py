#!/usr/bin/env python3
"""Create least-privilege Supabase roles for OrganAIzer and PostgREST."""

import argparse

import psycopg
from psycopg import sql


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--admin-url", required=True)
    parser.add_argument("--app-password", required=True)
    parser.add_argument("--authenticator-password", required=True)
    args = parser.parse_args()

    conn = psycopg.connect(args.admin_url, autocommit=True)
    try:
        roles = {row[0] for row in conn.execute("SELECT rolname FROM pg_roles")}
        for role, login in (
            ("anon", False),
            ("authenticated", False),
            ("service_role", False),
            ("authenticator", True),
            ("organaizer_backend", True),
        ):
            if role not in roles:
                conn.execute(
                    sql.SQL("CREATE ROLE {} {}").format(
                        sql.Identifier(role),
                        sql.SQL("LOGIN" if login else "NOLOGIN"),
                    )
                )

        # Run this command as Supabase's reserved `supabase_admin` role. It may
        # update the protected PostgREST authenticator as well as the dedicated
        # application login without granting either one superuser privileges.
        for role, password in (
            ("authenticator", args.authenticator_password),
            ("organaizer_backend", args.app_password),
        ):
            conn.execute(
                sql.SQL("ALTER ROLE {} PASSWORD {}").format(
                    sql.Identifier(role),
                    sql.Literal(password),
                )
            )

        conn.execute("GRANT anon, authenticated, service_role TO authenticator")
        conn.execute("GRANT USAGE ON SCHEMA public TO organaizer_backend")
        conn.execute(
            "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES "
            "IN SCHEMA public TO organaizer_backend"
        )
        conn.execute(
            "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES "
            "IN SCHEMA public TO organaizer_backend"
        )
        conn.execute(
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
            "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO organaizer_backend"
        )
        conn.execute(
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
            "GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO organaizer_backend"
        )

        # Direct anonymous database access is denied. All user-facing access
        # remains behind the existing authenticated Flask endpoints.
        conn.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon")
        conn.execute("GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role")
        conn.execute(
            "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES "
            "IN SCHEMA public TO service_role"
        )
        conn.execute(
            "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES "
            "IN SCHEMA public TO service_role"
        )
    finally:
        conn.close()
    print("Supabase roles and least-privilege grants configured")


if __name__ == "__main__":
    main()
