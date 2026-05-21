"""
WebSocket Router
Real-time incident and log streaming to dashboard clients.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)
        logger.info(f"WS client connected. Total: {len(self.active_connections)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)
        logger.info(f"WS client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: Dict):
        """Send a message to all connected clients."""
        if not self.active_connections:
            return
        message = json.dumps(data)
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_to(self, ws: WebSocket, data: Dict):
        """Send a message to a specific client."""
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            self.disconnect(ws)


manager = ConnectionManager()


@router.websocket("/events")
async def websocket_events(ws: WebSocket):
    """
    WebSocket endpoint for real-time platform events.
    Clients receive: new_incident, log_update, incident_update, heartbeat
    """
    await manager.connect(ws)
    try:
        # Send welcome message
        await manager.send_to(ws, {
            "type": "connected",
            "message": "AIOps Platform WebSocket connected",
        })

        # Heartbeat + listen loop
        while True:
            try:
                # Wait for client message (ping) or timeout
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await manager.send_to(ws, {"type": "pong"})
            except asyncio.TimeoutError:
                # Send heartbeat
                await manager.send_to(ws, {"type": "heartbeat"})
            except Exception:
                break
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)
