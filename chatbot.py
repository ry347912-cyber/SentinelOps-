"""
AI Chatbot Router
Natural language interface for querying incidents and getting guidance.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import logging

from app.database import get_db
from app.models import Incident, User
from app.schemas import ChatRequest, ChatResponse
from app.services.ai_analysis import chat_with_ai
from app.utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat with AI about incidents and operational issues."""
    # Build incident context if ID provided
    incident_context = None
    if request.incident_id:
        incident = db.query(Incident).filter(Incident.id == request.incident_id).first()
        if incident:
            incident_context = f"""
Incident #{incident.id}: {incident.title}
Type: {incident.incident_type}
Severity: {incident.severity}
Status: {incident.status}
Detected: {incident.detected_at}
Root Cause: {incident.root_cause or 'Not yet analyzed'}
Impacted Services: {', '.join(incident.impacted_services or [])}
Technical Summary: {incident.ai_summary_technical or 'Not yet generated'}
"""

    # Build conversation history for Claude
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in request.conversation_history[-10:]
    ]

    response_text = await chat_with_ai(
        message=request.message,
        history=history,
        incident_context=incident_context,
    )

    # Extract any suggested actions from the response
    suggested_actions = []
    if "kubectl" in response_text or "systemctl" in response_text:
        lines = response_text.split("\n")
        for line in lines:
            if "`" in line and any(cmd in line for cmd in ["kubectl", "systemctl", "docker", "nginx"]):
                action = line.strip().strip("`").strip()
                if action and len(action) < 200:
                    suggested_actions.append(action)

    return ChatResponse(
        response=response_text,
        sources=[],
        suggested_actions=suggested_actions[:3],
    )
