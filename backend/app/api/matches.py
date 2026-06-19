from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.models.profile import PlayerProfile, GuildProfile
from app.models.match import Match
from app.models.message import Message
from app.models.notification import Notification
from app.schemas.match import MatchResponse, MessageResponse, MessageCreate
from app.api.auth import get_current_user
from app.websocket.connection_manager import manager
from app.api.interests import create_db_notification_and_push
from app.core.logging import logger

router = APIRouter(prefix="/matches", tags=["matches"])

def get_match_and_verify_membership(match_id: int, user_id: int, db: Session) -> Match:
    """
    Queries a match record and verifies that the specified user owns
    either the matching player profile or guild profile.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
        
    player_profile = db.query(PlayerProfile).filter(PlayerProfile.id == match.player_profile_id).first()
    guild_profile = db.query(GuildProfile).filter(GuildProfile.id == match.guild_profile_id).first()
    
    if not player_profile or not guild_profile:
        raise HTTPException(status_code=400, detail="Associated profiles not found.")
        
    if player_profile.user_id != user_id and guild_profile.owner_user_id != user_id:
        logger.warning(f"Unauthorized match access attempt on Match {match_id} by user {user_id}.")
        raise HTTPException(status_code=403, detail="You are not a member of this match.")
        
    return match


@router.get("", response_model=List[MatchResponse])
def get_user_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all matches that the current user is part of (as a player or guild owner).
    """
    logger.info(f"Listing matches for user {current_user.username}")
    
    matches = db.query(Match).join(
        PlayerProfile, Match.player_profile_id == PlayerProfile.id
    ).join(
        GuildProfile, Match.guild_profile_id == GuildProfile.id
    ).filter(
        (PlayerProfile.user_id == current_user.id) | (GuildProfile.owner_user_id == current_user.id)
    ).all()
    
    # Pre-populate relations explicitly for Pydantic serialization
    for m in matches:
        m.player_profile = db.query(PlayerProfile).filter(PlayerProfile.id == m.player_profile_id).first()
        m.guild_profile = db.query(GuildProfile).filter(GuildProfile.id == m.guild_profile_id).first()
        
    return matches


@router.get("/{id}/messages", response_model=List[MessageResponse])
def get_match_messages(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all direct chat messages for a specific match.
    Only members of the match can access the messages.
    """
    logger.info(f"Fetching messages for Match ID {id} requested by {current_user.username}.")
    
    # Verifies user belongs to the match
    get_match_and_verify_membership(id, current_user.id, db)
    
    messages = db.query(Message).filter(Message.match_id == id).order_by(Message.created_at.asc()).all()
    
    # Optional: mark opposite user's messages as read
    try:
        unread = db.query(Message).filter(
            Message.match_id == id,
            Message.sender_user_id != current_user.id,
            Message.read_at.is_(None)
        ).all()
        for msg in unread:
            msg.read_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        logger.error(f"Error marking messages as read: {e}")
        
    return messages


@router.post("/{id}/messages", response_model=MessageResponse)
async def send_match_message(
    id: int,
    message_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sends a direct message inside a Match. Only members can post.
    Creates a Notification and triggers a WebSocket push to the recipient in real-time.
    """
    logger.info(f"User {current_user.username} sending message in Match ID {id}.")
    
    # Verify membership
    match = get_match_and_verify_membership(id, current_user.id, db)
    
    message = Message(
        match_id=id,
        sender_user_id=current_user.id,
        body=message_in.body
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Identify recipient user ID
    player_profile = db.query(PlayerProfile).filter(PlayerProfile.id == match.player_profile_id).first()
    guild_profile = db.query(GuildProfile).filter(GuildProfile.id == match.guild_profile_id).first()
    
    recipient_user_id = player_profile.user_id if current_user.id == guild_profile.owner_user_id else guild_profile.owner_user_id
    
    # Deliver dynamic database notifications + WebSocket push
    sender_name = current_user.username
    if current_user.id == player_profile.user_id:
        sender_tag = f"Player {player_profile.character_name}"
    else:
        sender_tag = f"Recruiter from <{guild_profile.guild_name}>"
        
    await create_db_notification_and_push(
        db, recipient_user_id, "message_received",
        f"New Message from {sender_name}",
        f"{sender_tag}: {message.body[:60]}...",
        {"match_id": match.id, "message_id": message.id, "sender_user_id": current_user.id}
    )
    
    return message
