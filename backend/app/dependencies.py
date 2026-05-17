"""FastAPI dependency providers for shared services."""
from functools import lru_cache

from openai import OpenAI

from app.adapters.supabase_adapter import get_supabase_client
from app.core.config import settings
from app.services.fire_starter_image_service import FireStarterImageService


@lru_cache()
def get_openai_client() -> OpenAI:
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def get_fire_starter_image_service() -> FireStarterImageService:
    return FireStarterImageService(get_openai_client(), get_supabase_client())
