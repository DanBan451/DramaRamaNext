#!/usr/bin/env python3
"""
One-off: generate images for Fire Starters missing image_url (not failed).
Usage (from backend/):
  python scripts/backfill_fire_starter_images.py
"""
from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

load_dotenv(BACKEND_ROOT / ".env")

from app.dependencies import get_fire_starter_image_service  # noqa: E402
from app.adapters.supabase_adapter import get_supabase_client  # noqa: E402


async def main() -> None:
    client = get_supabase_client()
    service = get_fire_starter_image_service()

    result = (
        client.table("fire_starters")
        .select("id, name, image_url, image_generation_status")
        .is_("image_url", "null")
        .neq("image_generation_status", "failed")
        .execute()
    )
    rows = result.data or []
    print(f"Found {len(rows)} Fire Starter(s) to backfill.")

    for i, row in enumerate(rows):
        fs_id = row["id"]
        name = row.get("name", "")
        print(f"[{i + 1}/{len(rows)}] Generating image for {fs_id} ({name})…")
        url = await service.generate_and_store_image(fs_id)
        print(f"  -> {'OK ' + url[:80] if url else 'FAILED'}")
        if i < len(rows) - 1:
            time.sleep(2.5)

    print("Backfill complete.")


if __name__ == "__main__":
    asyncio.run(main())
