from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from app.schemas.profile import PlayerProfileResponse, GuildProfileResponse

# --- Interest Schemas ---

class InterestCreate(BaseModel):
    player_profile_id: int
    guild_profile_id: int
    message: Optional[str] = None

class InterestResponse(BaseModel):
    id: int
    from_user_id: int
    player_profile_id: int
    guild_profile_id: int
    direction: str
    status: str
    message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Match Schemas ---

class MatchResponse(BaseModel):
    id: int
    player_profile_id: int
    guild_profile_id: int
    status: str
    created_at: datetime
    player_profile: Optional[PlayerProfileResponse] = None
    guild_profile: Optional[GuildProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)


# --- Message Schemas ---

class MessageCreate(BaseModel):
    body: str

class MessageResponse(BaseModel):
    id: int
    match_id: int
    sender_user_id: int
    body: str
    created_at: datetime
    read_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
