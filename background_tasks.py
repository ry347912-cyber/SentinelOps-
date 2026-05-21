"""
Background Tasks
Periodic log scanning, incident detection, and WebSocket broadcasting.
"""

import asyncio
import logging
from datetime import datetime
from app.config import settings
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# Global WebSocket manager (imported lazily to avoid circular imports)
_ws_manager = None


def get_ws_manager():
    global _ws_manager
    if _ws_manager is None:
        from app.routers.websocket import manager
        _ws_manager = manager
    return _ws_manager


async def periodic_incident_scan():
    """Scan for new incidents every N seconds."""
    while True:
        try:
            await asyncio.sleep(settings.INCIDENT_SCAN_INTERVAL)
            db = SessionLocal()
            try:
                from app.services.incident_detection import IncidentDetector
                detector = IncidentDetector(db)
                new_incidents = detector.scan_recent_logs(minutes=2)
                if new_incidents:
                    logger.info(f"🔍 Found {len(new_incidents)} new incidents")
                    ws = get_ws_manager()
                    for incident in new_incidents:
                        await ws.broadcast({
                            "type": "new_incident",
                            "incident_id": incident.id,
                            "title": incident.title,
                            "severity": incident.severity.value,
                            "timestamp": str(incident.detected_at),
                        })
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Background scan error: {e}")


async def start_background_tasks():
    """Launch all background workers."""
    asyncio.create_task(periodic_incident_scan())
    logger.info("✅ Background tasks started")
