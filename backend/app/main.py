from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import redis.asyncio as aioredis
from typing import Dict

from app.core.config import settings
from app.core.logging import setup_logging, logger
# We will import db dependency here
# We will create db modules next, but let's wire it up beforehand
# We use try/except block to allow clean early startup testing

from app.api.auth import router as auth_router
from app.api.players import router as players_router
from app.api.guilds import router as guilds_router
from app.api.interests import router as interests_router
from app.api.matches import router as matches_router
from app.api.notifications import router as notifications_router
from app.api.websocket import router as ws_router

setup_logging()

app = FastAPI(
    title="GuildPing API",
    description="Real-time World of Warcraft Recruitment Platform API Engine",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Include API routers
app.include_router(auth_router, prefix="/api")
app.include_router(players_router, prefix="/api")
app.include_router(guilds_router, prefix="/api")
app.include_router(interests_router, prefix="/api")
app.include_router(matches_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(ws_router)


# CORS configurations
origins = [
    settings.FRONTEND_URL,
    settings.PUBLIC_SITE_URL,
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI service startup initiated.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI service shutdown initiated.")

@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    """
    Diagnostic endpoint verifying backend service health,
    verifying postgres connection and redis connection.
    """
    logger.debug("Health check endpoint requested.")
    
    postgres_status = "unknown"
    redis_status = "unknown"
    
    # 1. Test Postgres
    try:
        from app.db.session import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            postgres_status = "connected"
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Healthcheck failed to query Postgres: {e}")
        postgres_status = f"error: {str(e)}"
        
    # 2. Test Redis
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.ping()
        await r.close()
        redis_status = "connected"
    except Exception as e:
        logger.error(f"Healthcheck failed to ping Redis: {e}")
        redis_status = f"error: {str(e)}"
        
    return {
        "status": "ok" if (postgres_status == "connected" and redis_status == "connected") else "degraded",
        "environment": settings.ENVIRONMENT,
        "postgres": postgres_status,
        "redis": redis_status
    }
