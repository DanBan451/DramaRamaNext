"""
DramaRama Backend API
FastAPI application with hexagonal architecture
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.api.routes import router as api_router
from app.core.config import settings

app = FastAPI(
    title="DramaRama API",
    description="Backend API for DramaRama - The Mental Gym for Algorithms",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "chrome-extension://*",   # Chrome extension
        settings.FRONTEND_URL if settings.FRONTEND_URL else "http://localhost:3000",
    ],
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

