from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Dict, Any

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    body: str
    payload: Dict[str, Any]
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
