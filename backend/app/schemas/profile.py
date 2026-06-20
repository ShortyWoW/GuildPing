from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any
from datetime import datetime

class AvailabilitySchema(BaseModel):
    days: List[int] = Field(default_factory=list, description="0=Sunday, 1=Monday, ..., 6=Saturday")
    start_time: str = Field(..., example="19:00")
    end_time: str = Field(..., example="22:00")
    timezone: str = Field("EST", example="EST")

class RaidScheduleSchema(BaseModel):
    days: List[int] = Field(default_factory=list, description="0=Sunday, 1=Monday, ..., 6=Saturday")
    start_time: str = Field(..., example="20:00")
    end_time: str = Field(..., example="23:00")
    timezone: str = Field("EST", example="EST")

class GuildNeedsSchema(BaseModel):
    roles: List[str] = Field(default_factory=list, example=["Healer", "DPS"])
    classes: List[str] = Field(default_factory=list, example=["Mage", "Priest"])


# --- Player Profile Schemas ---

class PlayerProfileCreate(BaseModel):
    character_name: str
    realm: str
    region: str
    faction: str
    class_name: str
    spec_name: str
    role: str
    item_level: Optional[int] = None
    recruitment_status: str = "LOOKING"
    goals: List[str] = Field(default_factory=list)
    availability: AvailabilitySchema
    transfer_willing: bool = False
    faction_change_willing: bool = False
    bio: Optional[str] = None
    discord_handle: Optional[str] = None
    battle_tag: Optional[str] = None
    avatar_url: Optional[str] = None
    visibility: str = "PUBLIC"

class PlayerProfileUpdate(BaseModel):
    character_name: Optional[str] = None
    realm: Optional[str] = None
    region: Optional[str] = None
    faction: Optional[str] = None
    class_name: Optional[str] = None
    spec_name: Optional[str] = None
    role: Optional[str] = None
    item_level: Optional[int] = None
    recruitment_status: Optional[str] = None
    goals: Optional[List[str]] = None
    availability: Optional[AvailabilitySchema] = None
    transfer_willing: Optional[bool] = None
    faction_change_willing: Optional[bool] = None
    bio: Optional[str] = None
    discord_handle: Optional[str] = None
    battle_tag: Optional[str] = None
    avatar_url: Optional[str] = None
    visibility: Optional[str] = None

class PlayerProfileResponse(BaseModel):
    id: int
    user_id: int
    character_name: str
    realm: str
    region: str
    faction: str
    class_name: str
    spec_name: str
    role: str
    item_level: Optional[int]
    is_verified: bool
    blizzard_character_id: Optional[int] = None
    recruitment_status: str
    goals: List[str]
    availability: Dict[str, Any]
    transfer_willing: bool
    faction_change_willing: bool
    bio: Optional[str]
    discord_handle: Optional[str]
    battle_tag: Optional[str]
    avatar_url: Optional[str] = None
    visibility: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CharacterImportRequest(BaseModel):
    character_name: str
    realm_slug: str
    region: str
    role: str


# --- Guild Profile Schemas ---

class GuildProfileCreate(BaseModel):
    guild_name: str
    realm: str
    region: str
    faction: str
    recruitment_status: str = "RECRUITING"
    progression_label: str
    goals: List[str] = Field(default_factory=list)
    raid_schedule: RaidScheduleSchema
    needs: GuildNeedsSchema
    description: Optional[str] = None
    discord_invite: Optional[str] = None
    website_url: Optional[str] = None
    visibility: str = "PUBLIC"

class GuildProfileUpdate(BaseModel):
    guild_name: Optional[str] = None
    realm: Optional[str] = None
    region: Optional[str] = None
    faction: Optional[str] = None
    recruitment_status: Optional[str] = None
    progression_label: Optional[str] = None
    goals: Optional[List[str]] = None
    raid_schedule: Optional[RaidScheduleSchema] = None
    needs: Optional[GuildNeedsSchema] = None
    description: Optional[str] = None
    discord_invite: Optional[str] = None
    website_url: Optional[str] = None
    visibility: Optional[str] = None

class GuildProfileResponse(BaseModel):
    id: int
    owner_user_id: int
    guild_name: str
    realm: str
    region: str
    faction: str
    is_verified: bool
    blizzard_guild_id: Optional[int] = None
    recruitment_status: str
    progression_label: str
    goals: List[str]
    raid_schedule: Dict[str, Any]
    needs: Dict[str, Any]
    description: Optional[str]
    discord_invite: Optional[str]
    website_url: Optional[str]
    visibility: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GuildImportRequest(BaseModel):
    character_name: str
    realm_slug: str
    region: str
    guild_name: str
    guild_id: int

    model_config = ConfigDict(from_attributes=True)
