from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class PlayerProfile(Base):
    """
    World of Warcraft Player Profile details.
    Each user can create one or more Player Profiles representing their characters.
    """
    __tablename__ = "player_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    character_name = Column(String, nullable=False)
    realm = Column(String, nullable=False)
    region = Column(String, nullable=False)  # US, EU, KR, TW
    faction = Column(String, nullable=False)  # Alliance, Horde, Cross-Faction
    class_name = Column(String, nullable=False)
    spec_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Tank, Healer, DPS
    item_level = Column(Integer, nullable=True)
    
    is_verified = Column(Boolean, default=False, nullable=False)
    blizzard_character_id = Column(Integer, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    recruitment_status = Column(String, default="LOOKING", nullable=False)  # LOOKING, OPEN_TO_OFFERS, NOT_LOOKING
    goals = Column(JSON, default=list, nullable=False)  # e.g., ["Mythic", "Cutting Edge"]
    
    # availability structure: {"days": [0,1,2], "start_time": "19:00", "end_time": "22:00", "timezone": "EST"}
    availability = Column(JSON, default=dict, nullable=False)
    
    transfer_willing = Column(Boolean, default=False, nullable=False)
    faction_change_willing = Column(Boolean, default=False, nullable=False)
    bio = Column(String, nullable=True)
    discord_handle = Column(String, nullable=True)
    battle_tag = Column(String, nullable=True)
    
    visibility = Column(String, default="PUBLIC", nullable=False)  # PUBLIC, PRIVATE, UNLISTED
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", backref="player_profiles")


class GuildProfile(Base):
    """
    World of Warcraft Guild Profile details.
    Guild Profiles are owned by recruiters or guild masters.
    """
    __tablename__ = "guild_profiles"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    guild_name = Column(String, nullable=False)
    realm = Column(String, nullable=False)
    region = Column(String, nullable=False)
    faction = Column(String, nullable=False)
    
    is_verified = Column(Boolean, default=False, nullable=False)
    blizzard_guild_id = Column(Integer, nullable=True)
    
    recruitment_status = Column(String, default="RECRUITING", nullable=False)  # RECRUITING, SELECTIVE, CLOSED
    progression_label = Column(String, nullable=False)  # e.g. "8/8H, 4/8M"
    goals = Column(JSON, default=list, nullable=False)  # e.g. ["Mythic", "Cutting Edge"]
    
    # raid_schedule structure: {"days": [1, 3], "start_time": "20:00", "end_time": "23:00", "timezone": "EST"}
    raid_schedule = Column(JSON, default=dict, nullable=False)
    
    # needs structure: {"roles": ["Healer", "DPS"], "classes": ["Mage", "Priest"]}
    needs = Column(JSON, default=dict, nullable=False)
    
    description = Column(String, nullable=True)
    discord_invite = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    
    visibility = Column(String, default="PUBLIC", nullable=False)  # PUBLIC, PRIVATE, UNLISTED
    discord_webhook_url = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", backref="guild_profiles")
