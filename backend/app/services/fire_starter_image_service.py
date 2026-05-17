"""
Async Fire Starter illustration generation — OpenAI Images + Supabase Storage.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from app.prompts.fire_starter_image_prompt import build_fire_starter_image_prompt

logger = logging.getLogger(__name__)

STORAGE_BUCKET = "generated-images"
IMAGE_MODELS = ("gpt-image-1", "dall-e-3")


class FireStarterImageService:
    def __init__(self, openai_client: Any, supabase_client: Any) -> None:
        self.openai_client = openai_client
        self.supabase = supabase_client

    def _update_row(self, fire_starter_id: str, fields: dict) -> None:
        self.supabase.table("fire_starters").update(fields).eq("id", fire_starter_id).execute()

    def _get_row(self, fire_starter_id: str) -> dict | None:
        result = (
            self.supabase.table("fire_starters")
            .select("id, name, description, image_generation_status")
            .eq("id", fire_starter_id)
            .single()
            .execute()
        )
        return result.data if result.data else None

    def _generate_image_sync(self, prompt: str) -> tuple[bytes, str]:
        """Returns (image_bytes, model_used). Tries gpt-image-1 then dall-e-3."""
        last_error: Exception | None = None
        for model in IMAGE_MODELS:
            try:
                kwargs: dict = {
                    "model": model,
                    "prompt": prompt,
                    "size": "1024x1024",
                    "n": 1,
                }
                if model == "gpt-image-1":
                    kwargs["quality"] = "high"
                else:
                    kwargs["quality"] = "standard"

                response = self.openai_client.images.generate(**kwargs)
                if not response.data:
                    raise RuntimeError(f"{model} returned no image data")

                item = response.data[0]
                if getattr(item, "b64_json", None):
                    return base64.b64decode(item.b64_json), model

                url = getattr(item, "url", None)
                if url:
                    with httpx.Client(timeout=60.0) as client:
                        r = client.get(url)
                        r.raise_for_status()
                        return r.content, model

                raise RuntimeError(f"{model} returned neither b64_json nor url")
            except Exception as e:
                last_error = e
                logger.warning("Image model %s failed: %s", model, e)
                continue

        raise last_error or RuntimeError("All image models failed")

    def _upload_sync(self, image_bytes: bytes) -> str:
        file_path = f"fire_starters/{uuid.uuid4()}.png"
        self.supabase.storage.from_(STORAGE_BUCKET).upload(
            file_path,
            image_bytes,
            file_options={"content-type": "image/png", "upsert": "true"},
        )
        return self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(file_path)

    def _generate_and_store_sync(self, fire_starter_id: str) -> Optional[str]:
        self._update_row(fire_starter_id, {"image_generation_status": "generating"})

        row = self._get_row(fire_starter_id)
        if not row:
            logger.error("Fire Starter %s not found for image generation", fire_starter_id)
            return None

        description = (row.get("description") or "").strip()
        name = (row.get("name") or "").strip()
        lesson = description or name
        prompt = build_fire_starter_image_prompt(lesson)

        image_bytes, model_used = self._generate_image_sync(prompt)
        logger.info(
            "Generated Fire Starter image for %s using %s",
            fire_starter_id,
            model_used,
        )

        public_url = self._upload_sync(image_bytes)
        now = datetime.now(timezone.utc).isoformat()
        self._update_row(
            fire_starter_id,
            {
                "image_url": public_url,
                "image_generation_status": "completed",
                "image_generated_at": now,
                "image_generation_error": None,
            },
        )
        return public_url

    async def generate_and_store_image(self, fire_starter_id: str) -> Optional[str]:
        try:
            return await asyncio.to_thread(self._generate_and_store_sync, fire_starter_id)
        except Exception as e:
            logger.exception(
                "Fire Starter image generation failed for %s: %s",
                fire_starter_id,
                e,
            )
            err_msg = str(e)[:500]
            try:
                await asyncio.to_thread(
                    self._update_row,
                    fire_starter_id,
                    {
                        "image_generation_status": "failed",
                        "image_generation_error": err_msg,
                    },
                )
            except Exception as update_err:
                logger.error(
                    "Failed to record image error for %s: %s",
                    fire_starter_id,
                    update_err,
                )
            return None
