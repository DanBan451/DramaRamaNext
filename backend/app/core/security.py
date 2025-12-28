"""
Security utilities - JWT validation with Clerk
"""
import jwt
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from typing import Optional

from app.core.config import settings

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

@lru_cache(maxsize=1)
def get_jwks():
    """Fetch JWKS from Clerk (cached)"""
    if not settings.CLERK_JWKS_URL:
        return None
    
    try:
        response = httpx.get(settings.CLERK_JWKS_URL)
        return response.json()
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}")
        return None

def get_public_key(token: str):
    """Get the public key for verifying the JWT"""
    jwks = get_jwks()
    if not jwks:
        return None
    
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return jwt.algorithms.RSAAlgorithm.from_jwk(key)
    except Exception as e:
        print(f"Failed to get public key: {e}")
    
    return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Validate JWT token and return user info
    """
    token = credentials.credentials
    return await get_user_from_token(token)


async def get_user_from_token(token: str) -> dict:
    """
    Validate a JWT token string and return user info.
    (Used for header auth and for SSE query-param auth.)
    """
    
    # In development without Clerk configured, allow mock user
    if settings.ENVIRONMENT == "development" and not settings.CLERK_JWKS_URL:
        return {
            "user_id": "dev_user_123",
            "email": "dev@example.com",
        }
    
    public_key = get_public_key(token)
    if not public_key:
        # IMPORTANT: Do NOT silently fall back to a fake user when Clerk is configured.
        # That creates identity mismatches (session created as one user, responded as another).
        raise HTTPException(
            status_code=401,
            detail="Invalid token (unable to find matching JWKS key). Check CLERK_JWKS_URL and use a fresh token.",
        )
    
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Get a fresh token from DramaRama and try again.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security)
) -> Optional[dict]:
    """
    Optional authentication - returns None if no valid token
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

