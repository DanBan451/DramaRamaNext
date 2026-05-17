#!/usr/bin/env python3
"""
Apply migration 019_fire_starter_images.sql via Supabase PostgREST is not possible for DDL.
Uses DATABASE_URL or SUPABASE_DB_URL if set; otherwise prints SQL for manual run in Supabase SQL Editor.

Verify columns:
  python scripts/run_migration_019.py --verify-only
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
MIGRATION_PATH = BACKEND_ROOT / "migrations" / "019_fire_starter_images.sql"


def verify_columns() -> bool:
    from supabase import create_client

    load_dotenv(BACKEND_ROOT / ".env")
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        print("SUPABASE_URL and SUPABASE_SERVICE_KEY required for --verify-only")
        return False

    client = create_client(url, key)
    try:
        client.table("fire_starters").select(
            "id, image_url, image_generation_status, image_generation_error, image_generated_at"
        ).limit(1).execute()
        print("OK: fire_starters image columns are present.")
        return True
    except Exception as e:
        print(f"VERIFY FAILED: {e}")
        return False


def run_sql_file(database_url: str) -> None:
    try:
        import psycopg2
    except ImportError:
        print("Install psycopg2-binary to run migrations from CLI: pip install psycopg2-binary")
        sys.exit(1)

    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        print(f"Applied {MIGRATION_PATH.name} successfully.")
    finally:
        conn.close()


def main() -> None:
    load_dotenv(BACKEND_ROOT / ".env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    if args.verify_only:
        ok = verify_columns()
        sys.exit(0 if ok else 1)

    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if db_url:
        run_sql_file(db_url)
        verify_columns()
        return

    print("No DATABASE_URL / SUPABASE_DB_URL in .env — run this SQL in Supabase SQL Editor:\n")
    print(MIGRATION_PATH.read_text(encoding="utf-8"))
    print("\nProject ref: gimqzadabstipcznotbk")
    print("Then verify: python scripts/run_migration_019.py --verify-only")


if __name__ == "__main__":
    main()
