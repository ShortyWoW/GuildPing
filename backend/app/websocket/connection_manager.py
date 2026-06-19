from fastapi import WebSocket
from typing import Dict, List
import json
from app.core.logging import logger

class ConnectionManager:
    """
    Manages active WebSocket connections mapped by user ID.
    Enables instant notification pushes to online recruiters and players.
    """
    def __init__(self):
        # Maps user_id (int) to a list of active WebSocket connections (since a user can have multiple tabs open)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """
        Accepts the connection and maps the socket to the user ID.
        """
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected to WebSocket channel. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        """
        Removes the connection mapping.
        """
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                logger.info(f"User {user_id} disconnected from WebSocket connection.")
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        """
        Pushes a serialized JSON message directly to all active connections of a user.
        """
        if user_id in self.active_connections:
            logger.info(f"Pushing real-time notification to user {user_id}...")
            payload = json.dumps(message)
            # Send to all open tabs for this user
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.error(f"Failed to push message to socket for user {user_id}: {e}")

manager = ConnectionManager()
