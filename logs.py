"""
Log Ingestion Router
Endpoints for uploading and querying log data.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.models import LogEntry, User, LogSource, LogLevel
from app.schemas import LogEntryCreate, LogEntryResponse, LogBatchCreate, LogUploadResponse
from app.services.log_ingestion import parse_log_file
from app.services.incident_detection import IncidentDetector
from app.utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=LogUploadResponse)
async def upload_log_file(
    file: UploadFile = File(...),
    source: LogSource = Form(LogSource.application),
    service_name: Optional[str] = Form(None),
    host: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a log file (TXT or JSON) for ingestion and analysis."""
    if not file.filename.endswith((".txt", ".log", ".json")):
        raise HTTPException(400, "Only .txt, .log, and .json files are supported")

    content = await file.read()
    try:
        text = content.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(400, "Could not decode file content")

    # Parse logs
    parsed = parse_log_file(text, source, service_name=service_name, host=host)
    if not parsed:
        raise HTTPException(400, "No valid log entries found in file")

    # Store in database
    log_ids = []
    db_logs = []
    for entry in parsed:
        log = LogEntry(
            source=source,
            level=entry.get("level", LogLevel.INFO),
            message=entry.get("message", "")[:2000],
            service_name=entry.get("service_name") or service_name,
            host=entry.get("host") or host,
            raw_log=entry.get("raw_log"),
            metadata_=entry.get("metadata_", {}),
            status_code=entry.get("status_code"),
            response_time_ms=entry.get("response_time_ms"),
            uploaded_by=current_user.id,
        )
        db.add(log)
        db_logs.append(log)

    db.flush()
    log_ids = [l.id for l in db_logs]

    # Detect incidents from uploaded logs
    detector = IncidentDetector(db)
    new_incidents = detector.detect_from_logs(db_logs)
    db.commit()

    return LogUploadResponse(
        message=f"Successfully ingested {len(db_logs)} log entries",
        total_logs=len(db_logs),
        incidents_detected=len(new_incidents),
        log_ids=log_ids,
    )


@router.post("/ingest", response_model=LogUploadResponse)
async def ingest_logs_api(
    batch: LogBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingest logs via API (JSON batch)."""
    db_logs = []
    for entry in batch.logs:
        log = LogEntry(
            source=entry.source,
            level=entry.level,
            message=entry.message[:2000],
            service_name=entry.service_name,
            host=entry.host,
            timestamp=entry.timestamp or datetime.utcnow(),
            raw_log=entry.raw_log,
            metadata_=entry.metadata_ or {},
            error_code=entry.error_code,
            status_code=entry.status_code,
            response_time_ms=entry.response_time_ms,
            uploaded_by=current_user.id,
        )
        db.add(log)
        db_logs.append(log)

    db.flush()
    detector = IncidentDetector(db)
    new_incidents = detector.detect_from_logs(db_logs)
    db.commit()

    return LogUploadResponse(
        message=f"Ingested {len(db_logs)} logs",
        total_logs=len(db_logs),
        incidents_detected=len(new_incidents),
        log_ids=[l.id for l in db_logs],
    )


@router.get("/", response_model=List[LogEntryResponse])
async def list_logs(
    source: Optional[LogSource] = None,
    level: Optional[LogLevel] = None,
    service: Optional[str] = None,
    incident_id: Optional[int] = None,
    hours: int = Query(24, ge=1, le=720),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List log entries with filters."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(LogEntry).filter(LogEntry.timestamp >= cutoff)

    if source:
        query = query.filter(LogEntry.source == source)
    if level:
        query = query.filter(LogEntry.level == level)
    if service:
        query = query.filter(LogEntry.service_name.ilike(f"%{service}%"))
    if incident_id:
        query = query.filter(LogEntry.incident_id == incident_id)

    logs = (
        query.order_by(desc(LogEntry.timestamp))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return logs


@router.get("/stats")
async def log_stats(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get log statistics for dashboard."""
    from sqlalchemy import func
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    total = db.query(func.count(LogEntry.id)).filter(LogEntry.timestamp >= cutoff).scalar()
    by_level = db.query(LogEntry.level, func.count(LogEntry.id)).filter(
        LogEntry.timestamp >= cutoff
    ).group_by(LogEntry.level).all()
    by_source = db.query(LogEntry.source, func.count(LogEntry.id)).filter(
        LogEntry.timestamp >= cutoff
    ).group_by(LogEntry.source).all()

    return {
        "total": total,
        "by_level": {str(k): v for k, v in by_level},
        "by_source": {str(k): v for k, v in by_source},
    }


@router.post("/seed-sample")
async def seed_sample_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Seed database with realistic sample logs for demo."""
    from app.sample_data import SAMPLE_LOGS
    db_logs = []
    for entry in SAMPLE_LOGS:
        log = LogEntry(**entry, uploaded_by=current_user.id)
        db.add(log)
        db_logs.append(log)
    db.flush()
    detector = IncidentDetector(db)
    incidents = detector.detect_from_logs(db_logs)
    db.commit()
    return {"seeded_logs": len(db_logs), "incidents_created": len(incidents)}
