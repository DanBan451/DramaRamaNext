"""
Application configuration using Pydantic Settings with AWS Secrets Manager support
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # Clerk
    CLERK_JWKS_URL: str = ""
    
    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Developer email (unlimited nudges, puzzle generation access)
    DEV_EMAIL: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """
    Load settings from AWS Secrets Manager if USE_AWS_SECRETS=true,
    otherwise fall back to .env file
    """
    use_aws_secrets = os.getenv("USE_AWS_SECRETS", "").lower() == "true"
    
    if use_aws_secrets:
        try:
            from app.core.secrets import get_secret
            secrets = get_secret()
            
            if secrets:
                logger.info("Loading configuration from AWS Secrets Manager")
                # Override environment variables with secrets
                for key, value in secrets.items():
                    os.environ[key] = value
        except Exception as e:
            logger.error(f"Failed to load AWS secrets, falling back to .env: {e}")
    
    return Settings()

settings = get_settings()

