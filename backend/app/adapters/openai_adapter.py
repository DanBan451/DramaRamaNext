"""
OpenAI Adapter - For DALL-E image generation with Supabase Storage persistence
"""
import logging
import httpx
import uuid
from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to import OpenAI
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.error("OpenAI package not installed. Run: pip install openai")

# Try to import Supabase for storage
try:
    from supabase import create_client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logger.warning("Supabase package not available for image storage")

class OpenAIImageAdapter:
    STORAGE_BUCKET = "generated-images"
    
    def __init__(self):
        self.client = None
        self.supabase = None
        
        if not OPENAI_AVAILABLE:
            logger.error("OpenAI package not available")
            return
            
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured - image generation disabled")
            return
            
        try:
            self.client = OpenAI(api_key=api_key)
            logger.info(f"OpenAI client initialized (key starts with: {api_key[:10]}...)")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
        
        # Initialize Supabase for storage
        if SUPABASE_AVAILABLE and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                logger.info("Supabase storage client initialized for image persistence")
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase storage: {e}")
    
    async def _download_image(self, url: str) -> bytes:
        """Download image from URL and return bytes."""
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            return response.content
    
    async def _upload_to_supabase(self, image_data: bytes, filename: str) -> str:
        """Upload image to Supabase Storage and return public URL."""
        if not self.supabase:
            raise Exception("Supabase storage not configured")
        
        # Upload to storage bucket
        file_path = f"{filename}"
        
        # Use upsert to overwrite if exists
        result = self.supabase.storage.from_(self.STORAGE_BUCKET).upload(
            file_path,
            image_data,
            file_options={"content-type": "image/png", "upsert": "true"}
        )
        
        # Get public URL
        public_url = self.supabase.storage.from_(self.STORAGE_BUCKET).get_public_url(file_path)
        logger.info(f"Image uploaded to Supabase: {public_url[:80]}...")
        return public_url
    
    async def generate_image(self, prompt: str, size: str = "256x256") -> str:
        """
        Generate an image using DALL-E, upload to Supabase Storage, and return permanent URL.
        Returns empty string if generation fails or API key not configured.
        """
        if not self.client:
            logger.error("OpenAI client not available - cannot generate image")
            raise Exception("OpenAI client not configured. Check OPENAI_API_KEY in .env")
        
        try:
            logger.info(f"Calling DALL-E with prompt: {prompt[:100]}...")
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            if not response.data:
                logger.error("DALL-E returned empty response.data")
                raise Exception("DALL-E returned no image data")
                
            temp_url = response.data[0].url
            if not temp_url:
                logger.error("DALL-E returned empty URL")
                raise Exception("DALL-E returned empty image URL")
                
            logger.info(f"DALL-E image generated: {temp_url[:80]}...")
            
            # Download and upload to permanent storage
            if self.supabase:
                try:
                    image_data = await self._download_image(temp_url)
                    filename = f"{uuid.uuid4()}.png"
                    permanent_url = await self._upload_to_supabase(image_data, filename)
                    logger.info(f"Image persisted to Supabase Storage: {permanent_url[:80]}...")
                    return permanent_url
                except Exception as e:
                    logger.error(f"Failed to persist image to Supabase: {e}")
                    # Fall back to temporary URL (will expire)
                    logger.warning("Falling back to temporary DALL-E URL (will expire in ~1 hour)")
                    return temp_url
            else:
                logger.warning("Supabase storage not configured - returning temporary DALL-E URL (will expire)")
                return temp_url
                
        except Exception as e:
            logger.error(f"Image generation failed: {type(e).__name__}: {e}")
            raise
