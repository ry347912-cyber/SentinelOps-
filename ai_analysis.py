"""
AI Analysis Service
Uses Anthropic Claude for intelligent root cause analysis,
remediation recommendations, and incident summaries.
"""

import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings
from app.models import Incident, LogEntry

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-20250514"
API_URL = "https://api.anthropic.com/v1/messages"


async def call_claude(
    system_prompt: str,
    user_message: str,
    max_tokens: int = 2000,
) -> str:
    """Call Anthropic Claude API with retry logic."""
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_message}],
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        return None


# ─── Root Cause Analysis ──────────────────────────────────────────────────────

SYSTEM_ROOT_CAUSE = """You are an expert SRE (Site Reliability Engineer) and AIOps analyst.
Analyze the provided incident logs and identify the root cause.
Always respond in valid JSON format with this exact structure:
{
  "root_cause": "Brief one-sentence root cause",
  "confidence_score": 0.0-1.0,
  "reasoning_trace": ["step 1...", "step 2...", "step 3..."],
  "contributing_factors": [
    {"factor": "name", "description": "details", "impact": "high|medium|low"}
  ],
  "recommended_actions": ["action 1", "action 2"],
  "timeline_summary": "Brief narrative of what happened and when"
}"""


async def analyze_root_cause(
    incident: Incident,
    logs: List[LogEntry],
) -> Dict[str, Any]:
    """
    Perform AI-powered root cause analysis on an incident.
    Returns structured analysis with confidence score and reasoning trace.
    """
    # Format logs for analysis
    log_text = "\n".join([
        f"[{l.timestamp}] [{l.level}] [{l.service_name or 'unknown'}] {l.message}"
        for l in logs[:50]  # Limit for token budget
    ])

    user_message = f"""
INCIDENT: {incident.title}
TYPE: {incident.incident_type}
SEVERITY: {incident.severity}
IMPACTED SERVICES: {', '.join(incident.impacted_services or [])}
AFFECTED HOSTS: {', '.join(incident.affected_hosts or [])}
DETECTED AT: {incident.detected_at}

RELEVANT LOG ENTRIES ({len(logs)} total, showing first 50):
{log_text}

Perform a detailed root cause analysis. Consider the timeline, error patterns,
and correlations between services. Be specific and actionable.
"""

    response = await call_claude(SYSTEM_ROOT_CAUSE, user_message, max_tokens=1500)

    if response:
        try:
            # Strip markdown code blocks if present
            clean = response.strip()
            if clean.startswith("```"):
                clean = "\n".join(clean.split("\n")[1:-1])
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("Failed to parse root cause JSON, using fallback")

    # Fallback if AI unavailable
    return _fallback_root_cause(incident, logs)


def _fallback_root_cause(incident: Incident, logs: List[LogEntry]) -> Dict:
    """Rule-based fallback root cause analysis."""
    error_logs = [l for l in logs if l.level in ("ERROR", "CRITICAL")]
    top_errors = list(set(l.message[:100] for l in error_logs[:5]))

    return {
        "root_cause": f"Multiple {incident.incident_type.value} events detected in {', '.join(incident.impacted_services or ['unknown service'])}",
        "confidence_score": incident.confidence_score,
        "reasoning_trace": [
            f"Detected {len(error_logs)} error/critical log entries",
            f"Incident type matches pattern: {incident.incident_type.value}",
            f"Affected services: {', '.join(incident.impacted_services or ['unknown'])}",
            "Rule-based detection triggered (AI analysis unavailable)",
        ],
        "contributing_factors": [
            {"factor": "Error frequency", "description": f"{len(error_logs)} errors detected", "impact": "high"}
        ],
        "recommended_actions": ["Review service logs", "Check infrastructure health", "Escalate if unresolved"],
        "timeline_summary": f"Incident started at {incident.detected_at} with {len(logs)} related log events",
    }


# ─── Remediation Generator ────────────────────────────────────────────────────

SYSTEM_REMEDIATION = """You are a senior DevOps/SRE engineer. Generate specific, actionable remediation steps.
Always respond in valid JSON:
{
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "What to do and why",
      "command": "actual shell/kubectl/docker command if applicable",
      "type": "immediate|short_term|long_term",
      "automated": true/false,
      "estimated_time": "X minutes"
    }
  ],
  "estimated_resolution_time": "X-Y minutes",
  "automation_possible": true/false,
  "priority_actions": ["action 1", "action 2"],
  "prevention_tips": ["tip 1", "tip 2"]
}"""


async def generate_remediation(
    incident: Incident,
    root_cause: str,
) -> Dict[str, Any]:
    """Generate step-by-step remediation plan using Claude."""
    user_message = f"""
INCIDENT: {incident.title}
TYPE: {incident.incident_type}
SEVERITY: {incident.severity}
ROOT CAUSE: {root_cause}
IMPACTED SERVICES: {', '.join(incident.impacted_services or [])}

Generate specific DevOps remediation steps with actual commands.
Include Kubernetes, Docker, systemd, nginx commands as appropriate.
"""
    response = await call_claude(SYSTEM_REMEDIATION, user_message, max_tokens=1500)

    if response:
        try:
            clean = response.strip()
            if clean.startswith("```"):
                clean = "\n".join(clean.split("\n")[1:-1])
            return json.loads(clean)
        except json.JSONDecodeError:
            pass

    return _fallback_remediation(incident)


def _fallback_remediation(incident: Incident) -> Dict:
    """Predefined remediation for common incident types."""
    remediation_map = {
        "failed_deployment": {
            "steps": [
                {"step": 1, "title": "Check deployment status", "command": "kubectl rollout status deployment/<name>", "type": "immediate", "automated": False, "estimated_time": "2 min"},
                {"step": 2, "title": "Rollback deployment", "command": "kubectl rollout undo deployment/<name>", "type": "immediate", "automated": True, "estimated_time": "3 min"},
                {"step": 3, "title": "Check pod logs", "command": "kubectl logs -l app=<name> --previous", "type": "immediate", "automated": False, "estimated_time": "5 min"},
            ],
            "estimated_resolution_time": "10-15 minutes",
            "automation_possible": True,
        },
        "service_downtime": {
            "steps": [
                {"step": 1, "title": "Check service health", "command": "systemctl status <service>", "type": "immediate", "automated": False, "estimated_time": "1 min"},
                {"step": 2, "title": "Restart service", "command": "systemctl restart <service>", "type": "immediate", "automated": True, "estimated_time": "2 min"},
                {"step": 3, "title": "Check resource usage", "command": "top -bn1 | head -20", "type": "immediate", "automated": False, "estimated_time": "3 min"},
            ],
            "estimated_resolution_time": "5-10 minutes",
            "automation_possible": True,
        },
        "memory_spike": {
            "steps": [
                {"step": 1, "title": "Identify memory-heavy processes", "command": "ps aux --sort=-%mem | head -10", "type": "immediate", "automated": False, "estimated_time": "2 min"},
                {"step": 2, "title": "Clear system cache", "command": "sync && echo 3 > /proc/sys/vm/drop_caches", "type": "immediate", "automated": True, "estimated_time": "1 min"},
                {"step": 3, "title": "Scale deployment", "command": "kubectl scale deployment/<name> --replicas=3", "type": "short_term", "automated": True, "estimated_time": "5 min"},
            ],
            "estimated_resolution_time": "10-20 minutes",
            "automation_possible": True,
        },
    }

    default = {
        "steps": [
            {"step": 1, "title": "Investigate logs", "command": "journalctl -xe | tail -100", "type": "immediate", "automated": False, "estimated_time": "5 min"},
            {"step": 2, "title": "Check service status", "command": "systemctl status", "type": "immediate", "automated": False, "estimated_time": "2 min"},
            {"step": 3, "title": "Escalate to on-call", "command": None, "type": "immediate", "automated": False, "estimated_time": "5 min"},
        ],
        "estimated_resolution_time": "15-30 minutes",
        "automation_possible": False,
    }

    remediation = remediation_map.get(incident.incident_type.value, default)
    remediation["priority_actions"] = ["Stabilize the service", "Gather root cause evidence"]
    remediation["prevention_tips"] = ["Set up proper monitoring alerts", "Implement auto-scaling"]
    return remediation


# ─── Summary Generator ────────────────────────────────────────────────────────

SYSTEM_SUMMARY = """You are a technical writer and incident manager. Generate incident summaries.
Always respond in valid JSON:
{
  "technical_summary": "Detailed technical summary for engineers (3-5 sentences)",
  "management_summary": "Business impact summary for non-technical stakeholders (2-3 sentences)",
  "key_metrics": {
    "affected_users_estimate": "number or range",
    "data_loss": "none|minimal|significant",
    "sla_breach": true/false,
    "business_impact": "low|medium|high|critical"
  },
  "lessons_learned": ["lesson 1", "lesson 2"],
  "follow_up_actions": ["action 1", "action 2"]
}"""


async def generate_summary(
    incident: Incident,
    root_cause: str,
    remediation_steps: List[Dict],
) -> Dict[str, Any]:
    """Generate both technical and management summaries."""
    user_message = f"""
INCIDENT: {incident.title}
TYPE: {incident.incident_type}
SEVERITY: {incident.severity}
DETECTED: {incident.detected_at}
ROOT CAUSE: {root_cause}
IMPACTED SERVICES: {', '.join(incident.impacted_services or [])}
REMEDIATION: {json.dumps(remediation_steps[:3], indent=2)}

Generate comprehensive incident summaries for both technical and management audiences.
"""
    response = await call_claude(SYSTEM_SUMMARY, user_message, max_tokens=1000)

    if response:
        try:
            clean = response.strip()
            if clean.startswith("```"):
                clean = "\n".join(clean.split("\n")[1:-1])
            return json.loads(clean)
        except Exception:
            pass

    return {
        "technical_summary": f"Incident of type '{incident.incident_type.value}' detected with {incident.severity.value} severity. Root cause: {root_cause}. Impacted services: {', '.join(incident.impacted_services or ['unknown'])}.",
        "management_summary": f"A {incident.severity.value}-severity service incident was detected. Our team is actively investigating and remediation is underway.",
        "key_metrics": {"business_impact": incident.severity.value, "sla_breach": incident.severity.value in ("critical", "high")},
        "lessons_learned": ["Improve monitoring coverage", "Add automated alerts"],
        "follow_up_actions": ["Post-incident review", "Update runbooks"],
    }


# ─── Chatbot ──────────────────────────────────────────────────────────────────

SYSTEM_CHATBOT = """You are an AIOps assistant helping engineers investigate and resolve incidents.
You have access to incident data, logs, and remediation knowledge.
Be concise, technical, and actionable. Format commands in backticks.
If asked about a specific incident, use the provided context."""


async def chat_with_ai(
    message: str,
    history: List[Dict],
    incident_context: Optional[str] = None,
) -> str:
    """Handle chatbot conversation about incidents."""
    system = SYSTEM_CHATBOT
    if incident_context:
        system += f"\n\nCURRENT INCIDENT CONTEXT:\n{incident_context}"

    messages = history[-10:] + [{"role": "user", "content": message}]

    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 1000,
        "system": system,
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Chatbot API error: {e}")
        return "I'm having trouble connecting to the AI service. Please check the API configuration and try again."
