from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.connection_manager import manager
from app.core.security import decode_access_token
from app.core.logging import logger

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    WebSocket endpoint verifying JWT tokens on connection handshake.
    Maps connections to the authenticated user ID for targeted pushes.
    """
    user_id_str = decode_access_token(token)
    if not user_id_str:
        logger.warning("WebSocket connection handshake rejected: Invalid JWT token.")
        # Close connection with Policy Violation code
        await websocket.close(code=1008)
        return
        
    user_id = int(user_id_str)
    
    # Add connection to connection manager registry
    await manager.connect(user_id, websocket)
    
    try:
        # Listen for client heartbeat pings
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket session error for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)
