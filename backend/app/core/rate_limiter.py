"""
Rate Limiter - Protect against token abuse
Uses in-memory storage with sliding window algorithm
"""
import time
from collections import defaultdict
from functools import wraps
from fastapi import HTTPException, Request, Depends
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple in-memory rate limiter with sliding window."""
    
    def __init__(self):
        # Store: {key: [(timestamp, count), ...]}
        self.requests = defaultdict(list)
        
    def _clean_old_requests(self, key: str, window_seconds: int):
        """Remove requests outside the current window."""
        cutoff = time.time() - window_seconds
        self.requests[key] = [
            (ts, count) for ts, count in self.requests[key] 
            if ts > cutoff
        ]
    
    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """Check if request is allowed under rate limit."""
        self._clean_old_requests(key, window_seconds)
        
        total = sum(count for _, count in self.requests[key])
        
        if total >= max_requests:
            return False
        
        self.requests[key].append((time.time(), 1))
        return True
    
    def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        """Get remaining requests in current window."""
        self._clean_old_requests(key, window_seconds)
        total = sum(count for _, count in self.requests[key])
        return max(0, max_requests - total)

# Global rate limiter instance
rate_limiter = RateLimiter()

# Rate limit configurations
RATE_LIMITS = {
    "api_general": {"max_requests": 60, "window_seconds": 60},      # 60/min general API
    "llm_calls": {"max_requests": 15, "window_seconds": 60},        # 15/min LLM calls
    "image_generation": {"max_requests": 5, "window_seconds": 3600}, # 5/hour image gen
    "session_start": {"max_requests": 10, "window_seconds": 3600},  # 10 sessions/hour
}

def check_rate_limit(
    limit_type: str,
    key_prefix: str = "",
    get_key: Optional[Callable] = None,
):
    """
    Dependency for rate limiting endpoints.
    
    Usage:
        @router.post("/endpoint")
        async def endpoint(
            _rate_limit: None = Depends(check_rate_limit("llm_calls")),
            current_user: dict = Depends(get_current_user),
        ):
            ...
    """
    async def rate_limit_dependency(request: Request):
        config = RATE_LIMITS.get(limit_type, RATE_LIMITS["api_general"])
        
        # Build rate limit key
        if get_key:
            key = get_key(request)
        else:
            # Try to get user ID from request state (set by auth middleware)
            user_id = getattr(request.state, "user_id", None)
            if user_id:
                key = f"{key_prefix}:{limit_type}:{user_id}"
            else:
                # Fall back to IP for unauthenticated requests
                client_ip = request.client.host if request.client else "unknown"
                key = f"{key_prefix}:{limit_type}:ip:{client_ip}"
        
        if not rate_limiter.is_allowed(key, config["max_requests"], config["window_seconds"]):
            remaining = rate_limiter.get_remaining(key, config["max_requests"], config["window_seconds"])
            logger.warning(f"Rate limit exceeded for {key}")
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "limit_type": limit_type,
                    "max_requests": config["max_requests"],
                    "window_seconds": config["window_seconds"],
                    "remaining": remaining,
                    "retry_after": config["window_seconds"],
                }
            )
        
        return None
    
    return rate_limit_dependency


def rate_limit_user(user_id: str, limit_type: str) -> bool:
    """
    Check rate limit for a specific user. Returns True if allowed.
    Use this for inline rate limiting in route handlers.
    """
    config = RATE_LIMITS.get(limit_type, RATE_LIMITS["api_general"])
    key = f"{limit_type}:{user_id}"
    
    if not rate_limiter.is_allowed(key, config["max_requests"], config["window_seconds"]):
        logger.warning(f"Rate limit exceeded for user {user_id} on {limit_type}")
        return False
    return True


def get_user_limits(user_id: str) -> dict:
    """Get current rate limit status for a user."""
    status = {}
    for limit_type, config in RATE_LIMITS.items():
        key = f"{limit_type}:{user_id}"
        remaining = rate_limiter.get_remaining(key, config["max_requests"], config["window_seconds"])
        status[limit_type] = {
            "remaining": remaining,
            "max": config["max_requests"],
            "window_seconds": config["window_seconds"],
        }
    return status
