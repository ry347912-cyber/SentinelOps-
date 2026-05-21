"""
AIOps Incident Root Cause & Remediation Platform
Main FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.database import engine, Base
from app.routers import auth, logs, incidents, analysis, websocket, chatbot
from app.config import settings
from app.services.background_tasks import start_background_tasks

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - startup and shutdown events."""
    # Startup
    logger.info("🚀 Starting AIOps Platform...")
    Base.metadata.create_all(bind=engine)
    await start_background_tasks()
    logger.info("✅ AIOps Platform ready!")
    yield
    # Shutdown
    logger.info("🛑 Shutting down AIOps Platform...")


app = FastAPI(
    title="AIOps Incident Root Cause & Remediation Platform",
    description="Enterprise-grade AI-powered incident detection, analysis, and remediation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(logs.router, prefix="/api/logs", tags=["Log Ingestion"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["AI Analysis"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["AI Chatbot"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "AIOps Platform",
    }


@app.get("/api/stats")
async def platform_stats():
    """Quick platform statistics."""
    from app.database import SessionLocal
    from app.models.log import LogEntry
    from app.models.incident import Incident

    db = SessionLocal()
    try:
        total_logs = db.query(LogEntry).count()
        total_incidents = db.query(Incident).count()
        open_incidents = db.query(Incident).filter(
            Incident.status == "open"
        ).count()
        return {
            "total_logs": total_logs,
            "total_incidents": total_incidents,
            "open_incidents": open_incidents,
        }
    finally:
        db.close()
