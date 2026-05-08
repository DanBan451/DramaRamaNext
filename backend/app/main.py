"""
DramaRama Backend API
FastAPI application with hexagonal architecture
"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum

from app.api.routes import router as api_router
from app.core.config import settings

# Route app logs through Uvicorn's configured logger so they reliably show up in
# `journalctl -u dramarama.service` when running under systemd.
logger = logging.getLogger("uvicorn.error")

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
        # Log the underlying PostgREST/Supabase error so we can diagnose issues
        # (missing tables vs RLS/permissions vs bad query vs network, etc.).
        msg = str(exc)
        detail = getattr(exc, "message", None) or getattr(exc, "details", None) or msg
        logger.error(
            "PostgREST API error: method=%s path=%s detail=%s",
            request.method,
            request.url.path,
            detail,
            exc_info=exc,
        )
        msg_l = msg.lower()
        detail_s = str(detail).lower()

        # Missing column (common after pulling new code without running migrations)
        if (
            "column" in msg_l
            and (
                "does not exist" in msg_l
                or "unknown" in msg_l
                or "schema cache" in msg_l
            )
        ) or (
            "could not find" in detail_s
            and "column" in detail_s
        ):
            return JSONResponse(
                status_code=500,
                content={
                    "detail": (
                        "Your Supabase schema is missing a column the app expects "
                        "(for example `courses.course_label`). "
                        "In the Supabase SQL editor, run the migrations under "
                        "`DramaRamaNext/backend/migrations/` — at minimum "
                        "`014_course_label.sql` and `015_courses_allow_draft_intake_status.sql` "
                        "(and ensure older course migrations like `008_courses.sql` have been applied). "
                        "No backend restart is required after SQL changes."
                    )
                },
            )

        if (
            "PGRST205" in msg
            or "schema cache" in msg_l
            or "could not find the table" in msg_l
        ):
            return JSONResponse(
                status_code=500,
                content={
                    "detail": (
                        "Supabase schema is missing tables or they are not visible to PostgREST. "
                        "Apply the DramaRama schema: run the SQL migrations in "
                        "`DramaRamaNext/backend/migrations/` (users, sessions, responses, hints, "
                        "courses, course_puzzles, etc.), reload the schema if needed, then retry."
                    )
                },
            )
        return JSONResponse(
            status_code=500,
            content={"detail": f"Database error: {detail}"},
        )

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

