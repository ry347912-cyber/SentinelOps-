"""
AI Analysis Router
Endpoints for root cause analysis, remediation, and summaries.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import json
import io
import logging
from datetime import datetime

from app.database import get_db
from app.models import Incident, LogEntry, User
from app.schemas import RootCauseResponse, RemediationResponse, SummaryResponse, AnalysisRequest
from app.services.ai_analysis import (
    analyze_root_cause, generate_remediation, generate_summary
)
from app.utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze/{incident_id}")
async def run_full_analysis(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run full AI analysis on an incident:
    - Root cause analysis
    - Remediation steps
    - Technical & management summaries
    Updates the incident record with all findings.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, f"Incident {incident_id} not found")

    # Get related logs
    logs = db.query(LogEntry).filter(LogEntry.incident_id == incident_id).all()

    logger.info(f"🤖 Running AI analysis for incident {incident_id} with {len(logs)} logs")

    # 1. Root Cause Analysis
    rca_result = await analyze_root_cause(incident, logs)
    incident.root_cause = rca_result.get("root_cause")
    incident.root_cause_reasoning = json.dumps(rca_result.get("reasoning_trace", []))
    incident.confidence_score = rca_result.get("confidence_score", incident.confidence_score)

    # 2. Remediation
    remediation_result = await generate_remediation(incident, incident.root_cause or "Unknown")
    incident.remediation_steps = remediation_result.get("steps", [])
    incident.remediation_automated = remediation_result.get("automation_possible", False)

    # 3. Summaries
    summary_result = await generate_summary(
        incident, incident.root_cause or "Unknown", incident.remediation_steps
    )
    incident.ai_summary_technical = summary_result.get("technical_summary")
    incident.ai_summary_management = summary_result.get("management_summary")

    db.commit()
    db.refresh(incident)

    return {
        "incident_id": incident_id,
        "root_cause": rca_result,
        "remediation": remediation_result,
        "summary": summary_result,
        "updated_at": str(datetime.utcnow()),
    }


@router.get("/root-cause/{incident_id}", response_model=RootCauseResponse)
async def get_root_cause(
    incident_id: int,
    force_reanalyze: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get root cause analysis for an incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    if not incident.root_cause or force_reanalyze:
        logs = db.query(LogEntry).filter(LogEntry.incident_id == incident_id).all()
        rca = await analyze_root_cause(incident, logs)
        incident.root_cause = rca.get("root_cause")
        incident.root_cause_reasoning = json.dumps(rca.get("reasoning_trace", []))
        incident.confidence_score = rca.get("confidence_score", incident.confidence_score)
        db.commit()
    else:
        try:
            reasoning = json.loads(incident.root_cause_reasoning or "[]")
        except Exception:
            reasoning = []
        rca = {
            "root_cause": incident.root_cause,
            "confidence_score": incident.confidence_score,
            "reasoning_trace": reasoning,
            "contributing_factors": [],
            "recommended_actions": [],
        }

    return RootCauseResponse(
        incident_id=incident_id,
        root_cause=rca.get("root_cause", "Unknown"),
        confidence_score=rca.get("confidence_score", 0.0),
        reasoning_trace=rca.get("reasoning_trace", []),
        contributing_factors=rca.get("contributing_factors", []),
        recommended_actions=rca.get("recommended_actions", []),
    )


@router.get("/remediation/{incident_id}", response_model=RemediationResponse)
async def get_remediation(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get remediation steps for an incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    if not incident.remediation_steps:
        result = await generate_remediation(incident, incident.root_cause or "Unknown")
        incident.remediation_steps = result.get("steps", [])
        db.commit()
    else:
        result = {"steps": incident.remediation_steps, "estimated_resolution_time": "Unknown", "automation_possible": False, "priority_actions": []}

    return RemediationResponse(
        incident_id=incident_id,
        steps=result.get("steps", []),
        estimated_resolution_time=result.get("estimated_resolution_time", "Unknown"),
        automation_possible=result.get("automation_possible", False),
        priority_actions=result.get("priority_actions", []),
    )


@router.get("/summary/{incident_id}", response_model=SummaryResponse)
async def get_summary(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated summaries for an incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    if not incident.ai_summary_technical:
        result = await generate_summary(
            incident,
            incident.root_cause or "Unknown",
            incident.remediation_steps or [],
        )
        incident.ai_summary_technical = result.get("technical_summary")
        incident.ai_summary_management = result.get("management_summary")
        db.commit()

    return SummaryResponse(
        incident_id=incident_id,
        technical_summary=incident.ai_summary_technical or "",
        management_summary=incident.ai_summary_management or "",
        severity_score=incident.severity_score,
        impacted_services=incident.impacted_services or [],
        timeline=incident.timeline_events or [],
        key_metrics={},
    )


@router.get("/export/{incident_id}/json")
async def export_incident_json(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export incident report as JSON."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    logs = db.query(LogEntry).filter(LogEntry.incident_id == incident_id).limit(100).all()

    report = {
        "incident": {
            "id": incident.id,
            "title": incident.title,
            "type": str(incident.incident_type),
            "severity": str(incident.severity),
            "status": str(incident.status),
            "detected_at": str(incident.detected_at),
            "resolved_at": str(incident.resolved_at) if incident.resolved_at else None,
            "root_cause": incident.root_cause,
            "ai_summary_technical": incident.ai_summary_technical,
            "ai_summary_management": incident.ai_summary_management,
            "remediation_steps": incident.remediation_steps,
            "impacted_services": incident.impacted_services,
            "severity_score": incident.severity_score,
            "confidence_score": incident.confidence_score,
        },
        "logs": [
            {"timestamp": str(l.timestamp), "level": str(l.level), "message": l.message, "service": l.service_name}
            for l in logs
        ],
        "exported_at": str(datetime.utcnow()),
    }

    content = json.dumps(report, indent=2)
    return StreamingResponse(
        io.StringIO(content),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=incident_{incident_id}.json"},
    )
