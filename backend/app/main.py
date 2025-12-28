"""
DramaRama Backend API
FastAPI application with hexagonal architecture
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum

from app.api.routes import router as api_router
from app.core.config import settings

app = FastAPI(
    title="DramaRama API",
    description="Backend API for DramaRama - The Mental Gym for Algorithms",
    version="0.1.0",
)

# Friendlier error when Supabase schema hasn't been created yet
try:
    from postgrest.exceptions import APIError as PostgrestAPIError
except Exception:  # pragma: no cover
    PostgrestAPIError = None  # type: ignore


if PostgrestAPIError:
    @app.exception_handler(PostgrestAPIError)  # type: ignore[misc]
    async def postgrest_error_handler(request: Request, exc: Exception):
        msg = str(exc)
        if "PGRST205" in msg or "schema cache" in msg or "Could not find the table" in msg:
            return JSONResponse(
                status_code=500,
                content={
                    "detail": (
                        "Supabase tables are not created yet. "
                        "Run the SQL schema in Supabase (tables: users, sessions, responses, hints) "
                        "then restart the backend."
                    )
                },
            )
        return JSONResponse(status_code=500, content={"detail": "Database error"})

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    # NOTE: Chrome extensions have origins like `chrome-extension://<extension_id>`
    # `allow_origins` does NOT support wildcards like `chrome-extension://*`, so we use regex.
    allow_origins=[
        "http://localhost:3000",
        settings.FRONTEND_URL if settings.FRONTEND_URL else "http://localhost:3000",
    ],
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "dramarama-api"}

# AWS Lambda handler
handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

