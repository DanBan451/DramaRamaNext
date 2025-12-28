"""
Supabase sanity check for DramaRama.

What it does:
- Verifies required tables exist: users, sessions, responses, hints
- Prints counts and a few sample rows
- If you provide CLERK_ID or a JWT (TEST_AUTH_TOKEN), it prints sessions for that user

Run:
  cd backend
  source venv/bin/activate
  python scripts/supabase_check.py

Optional env:
  CLERK_ID=... python scripts/supabase_check.py
  TEST_AUTH_TOKEN=... python scripts/supabase_check.py   # will decode without verifying signature
"""

import os
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client

try:
    from postgrest.exceptions import APIError
except Exception:  # pragma: no cover
    APIError = Exception  # type: ignore


def eprint(msg: str) -> None:
    print(msg, flush=True)


def decode_unverified_sub(jwt_token: str) -> Optional[str]:
    """Decode JWT without verifying signature (debug only)."""
    try:
        import jwt as pyjwt  # PyJWT

        payload = pyjwt.decode(jwt_token, options={"verify_signature": False})
        return payload.get("sub")
    except Exception:
        return None


def safe_select(client, table: str, columns: str = "*", limit: int = 1):
    return client.table(table).select(columns).limit(limit).execute()


def safe_count(client, table: str) -> int:
    # PostgREST supports Prefer: count=exact via select(..., count="exact")
    res = client.table(table).select("id", count="exact").limit(1).execute()
    return int(getattr(res, "count", 0) or 0)


def main() -> None:
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    if not supabase_url:
        raise SystemExit("Missing SUPABASE_URL in backend/.env")
    if not supabase_key:
        raise SystemExit("Missing SUPABASE_SERVICE_KEY in backend/.env (use sb_secret_... from Supabase API Keys)")

    client = create_client(supabase_url, supabase_key)

    required_tables = ["users", "sessions", "responses", "hints"]
    eprint("\n== Supabase table existence ==")
    for t in required_tables:
        try:
            safe_select(client, t, "id", limit=1)
            eprint(f"✅ {t}: OK")
        except APIError as e:
            # Common: PGRST205 missing table
            eprint(f"❌ {t}: ERROR -> {getattr(e, 'message', str(e))}")

    eprint("\n== Counts ==")
    for t in required_tables:
        try:
            c = safe_count(client, t)
            eprint(f"- {t}: {c}")
        except Exception as e:
            eprint(f"- {t}: ERROR -> {str(e)}")

    # Identify current Clerk user for debugging
    clerk_id = os.getenv("CLERK_ID", "").strip() or None
    token = os.getenv("TEST_AUTH_TOKEN", "").strip() or None
    if not clerk_id and token:
        clerk_id = decode_unverified_sub(token)

    eprint("\n== User mapping check ==")
    if not clerk_id:
        eprint("No CLERK_ID or TEST_AUTH_TOKEN provided. Skipping per-user session lookup.")
        eprint("Tip: run `CLERK_ID=<your_clerk_user_id> python scripts/supabase_check.py`")
        return

    eprint(f"Using clerk_id: {clerk_id}")
    user_rows = client.table("users").select("id, clerk_id, email, created_at").eq("clerk_id", clerk_id).execute()
    if not user_rows.data:
        eprint("❌ No row found in `users` table for this clerk_id.")
        eprint("This usually means sessions were created under a different identity (e.g., dev_user_123) or user creation never happened.")
        return

    user = user_rows.data[0]
    user_id = user["id"]
    eprint(f"✅ Found users row: user_id={user_id}, email={user.get('email')}")

    eprint("\n== Sessions for this user (latest 10) ==")
    sessions = (
        client.table("sessions")
        .select("id, algorithm_title, status, prompts_completed, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    if not sessions.data:
        eprint("⚠️ No sessions found for this user_id.")
        return

    for s in sessions.data:
        eprint(
            f"- {s['id']} | {s.get('algorithm_title')} | {s.get('status')} | prompts={s.get('prompts_completed')} | {s.get('created_at')}"
        )


if __name__ == "__main__":
    main()


