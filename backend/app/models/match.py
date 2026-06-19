from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Interest(Base):
    """
    Tracks interest indicators from a player to a guild recruiter, or vice-versa.
    Mutual acceptance spawns a Match.
    """
    __tablename__ = "interests"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    player_profile_id = Column(Integer, ForeignKey("player_profiles.id", ondelete="CASCADE"), nullable=False)
    guild_profile_id = Column(Integer, ForeignKey("guild_profiles.id", ondelete="CASCADE"), nullable=False)
    
    direction = Column(String, nullable=False)  # PLAYER_TO_GUILD, GUILD_TO_PLAYER
    status = Column(String, default="PENDING", nullable=False)  # PENDING, ACCEPTED, DECLINED, WITHDRAWN
    message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    from_user = relationship("User")
    player_profile = relationship("PlayerProfile", backref="interests")
    guild_profile = relationship("GuildProfile", backref="interests")

    # Prevent duplicate active interests for the same pairing
    __table_args__ = (
        UniqueConstraint("player_profile_id", "guild_profile_id", "direction", name="uix_player_guild_direction"),
    )


class Match(Base):
    """
    Mutual Match object resulting from accepted player-guild pairings.
    Unlocks chat communication and messaging endpoints.
    """
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    player_profile_id = Column(Integer, ForeignKey("player_profiles.id", ondelete="CASCADE"), nullable=False)
    guild_profile_id = Column(Integer, ForeignKey("guild_profiles.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(String, default="ACTIVE", nullable=False)  # ACTIVE, ARCHIVED, CLOSED
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    player_profile = relationship("PlayerProfile", backref="matches")
    guild_profile = relationship("GuildProfile", backref="matches")

    # Prevent duplicate active matches for the same player-guild pair
    __table_args__ = (
        UniqueConstraint("player_profile_id", "guild_profile_id", name="uix_match_player_guild"),
    )
