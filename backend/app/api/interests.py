from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import httpx

from app.core.config import settings

from app.db.session import get_db
from app.models.user import User
from app.models.profile import PlayerProfile, GuildProfile
from app.models.match import Interest, Match
from app.models.notification import Notification
from app.schemas.match import InterestCreate, InterestResponse, MatchResponse
from app.api.auth import get_current_user
from app.websocket.connection_manager import manager
from app.core.logging import logger

router = APIRouter(prefix="/interests", tags=["interests"])

async def create_db_notification_and_push(
    db: Session,
    user_id: int,
    notif_type: str,
    title: str,
    body: str,
    payload: dict
):
    """
    Creates a database-backed notification and attempts to push it in real-time
    over active WebSocket channels.
    """
    try:
        notification = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            body=body,
            payload=payload
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        # Real-time WebSocket push
        await manager.send_personal_message({
            "id": notification.id,
            "type": notification.type,
            "title": notification.title,
            "body": notification.body,
            "payload": notification.payload,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat()
        }, user_id)
        
    except Exception as e:
        logger.error(f"Failed to create/push notification to user {user_id}: {e}")


async def send_discord_webhook_notification(
    webhook_url: str,
    player_profile: PlayerProfile,
    guild_profile: GuildProfile,
    message: Optional[str] = None
):
    """
    Asynchronously fires a Discord Webhook notification containing application details.
    """
    if not webhook_url:
        return
        
    try:
        class_lower = (player_profile.class_name or "").lower().strip()
        color_map = {
            "death knight": 12853051,   # #C41F3B
            "demon hunter": 10694857,   # #A330C9
            "druid": 16743690,          # #FF7D0A
            "evoker": 3379967,          # #33937F
            "hunter": 11261043,         # #ABD473
            "mage": 4179947,            # #3FC7EB
            "monk": 65432,              # #00FF98
            "paladin": 16092346,        # #F58CBA
            "priest": 16777215,         # #FFFFFF
            "rogue": 16774505,          # #FFF569
            "shaman": 28894,            # #0070DE
            "warlock": 8882157,         # #8787ED
            "warrior": 13081710,        # #C79C6E
        }
        color = color_map.get(class_lower, 10789024)
        
        # Build public URLs
        site_url = getattr(settings, "PUBLIC_SITE_URL", "http://localhost:8080").rstrip("/")
        # Embed fields
        fields = [
            {"name": "Realm (Region)", "value": f"{player_profile.realm} ({player_profile.region})", "inline": True},
            {"name": "Class & Spec", "value": f"{player_profile.spec_name} {player_profile.class_name}", "inline": True},
            {"name": "Item Level", "value": str(player_profile.item_level or "Unknown"), "inline": True},
            {"name": "Role", "value": player_profile.role, "inline": True},
        ]
        
        if message:
            fields.append({"name": "Applicant Message", "value": message, "inline": False})
            
        payload = {
            "embeds": [
                {
                    "title": f"New Applicant: {player_profile.character_name}",
                    "description": f"A player has expressed interest in **<{guild_profile.guild_name}>** on GuildPing!",
                    "url": f"{site_url}/dashboard",
                    "color": color,
                    "fields": fields,
                    "footer": {
                        "text": "GuildPing Recruitment Notification"
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(webhook_url, json=payload, timeout=4.0)
            if res.status_code not in [200, 204]:
                logger.warning(f"Discord webhook returned status code {res.status_code}: {res.text}")
                
    except Exception as e:
        logger.error(f"Failed to send Discord webhook notification: {e}")


@router.post("/player-to-guild", response_model=InterestResponse, status_code=status.HTTP_201_CREATED)
async def express_player_interest(
    interest_in: InterestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Expresses interest from a player profile to a guild profile.
    If reciprocal interest exists, automatically creates a Match.
    """
    logger.info(f"Player {current_user.username} expressing interest in Guild profile ID {interest_in.guild_profile_id}")
    
    # 1. Validate player profile ownership
    player_profile = db.query(PlayerProfile).filter(
        PlayerProfile.id == interest_in.player_profile_id,
        PlayerProfile.user_id == current_user.id
    ).first()
    if not player_profile:
        raise HTTPException(status_code=403, detail="You do not own this player profile.")
        
    # 2. Get guild profile details
    guild_profile = db.query(GuildProfile).filter(GuildProfile.id == interest_in.guild_profile_id).first()
    if not guild_profile:
        raise HTTPException(status_code=404, detail="Guild profile not found.")
        
    # 3. Check for existing interest in either direction
    existing = db.query(Interest).filter(
        Interest.player_profile_id == interest_in.player_profile_id,
        Interest.guild_profile_id == interest_in.guild_profile_id,
        Interest.direction == "PLAYER_TO_GUILD"
    ).first()
    
    if existing:
        if existing.status in ["PENDING", "ACCEPTED"]:
            raise HTTPException(status_code=400, detail="Interest already expressed.")
        # Reactivate withdrawn/declined interest
        existing.status = "PENDING"
        existing.message = interest_in.message
        db.commit()
        db.refresh(existing)
        interest = existing
    else:
        interest = Interest(
            from_user_id=current_user.id,
            player_profile_id=interest_in.player_profile_id,
            guild_profile_id=interest_in.guild_profile_id,
            direction="PLAYER_TO_GUILD",
            status="PENDING",
            message=interest_in.message
        )
        db.add(interest)
        db.commit()
        db.refresh(interest)
        
    logger.info(f"Interest record created successfully (ID: {interest.id})")
    
    # Trigger Discord Webhook Notification (if configured)
    if guild_profile.discord_webhook_url:
        await send_discord_webhook_notification(
            guild_profile.discord_webhook_url,
            player_profile,
            guild_profile,
            interest_in.message
        )
    
    # 4. Check for reciprocal interest (Guild-to-Player) that is PENDING
    reciprocal = db.query(Interest).filter(
        Interest.player_profile_id == interest_in.player_profile_id,
        Interest.guild_profile_id == interest_in.guild_profile_id,
        Interest.direction == "GUILD_TO_PLAYER",
        Interest.status == "PENDING"
    ).first()
    
    if reciprocal:
        logger.info("Reciprocal guild-to-player interest detected! Creating a mutual match.")
        interest.status = "ACCEPTED"
        reciprocal.status = "ACCEPTED"
        
        # Create match
        match = Match(
            player_profile_id=interest_in.player_profile_id,
            guild_profile_id=interest_in.guild_profile_id,
            status="ACTIVE"
        )
        db.add(match)
        db.commit()
        
        # Notify both sides
        await create_db_notification_and_push(
            db, guild_profile.owner_user_id, "match_created",
            "Mutual Match Created!",
            f"You matched with {player_profile.character_name}-{player_profile.realm}!",
            {"match_id": match.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
        )
        await create_db_notification_and_push(
            db, current_user.id, "match_created",
            "Mutual Match Created!",
            f"You matched with <{guild_profile.guild_name}>-{guild_profile.realm}!",
            {"match_id": match.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
        )
    else:
        # Notify guild recruiter of incoming interest
        await create_db_notification_and_push(
            db, guild_profile.owner_user_id, "interest_received",
            "New Recruitment Interest!",
            f"{player_profile.character_name} ({player_profile.spec_name} {player_profile.class_name}) is interested in your guild.",
            {"interest_id": interest.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
        )
        
    return interest


@router.post("/guild-to-player", response_model=InterestResponse, status_code=status.HTTP_201_CREATED)
async def express_guild_interest(
    interest_in: InterestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Expresses interest from a guild recruiter's profile to a player profile.
    If reciprocal interest exists, automatically creates a Match.
    """
    logger.info(f"Recruiter {current_user.username} expressing interest in Player profile ID {interest_in.player_profile_id}")
    
    # 1. Validate guild profile ownership
    guild_profile = db.query(GuildProfile).filter(
        GuildProfile.id == interest_in.guild_profile_id,
        GuildProfile.owner_user_id == current_user.id
    ).first()
    if not guild_profile:
        raise HTTPException(status_code=403, detail="You do not own this guild profile.")
        
    # 2. Get player profile details
    player_profile = db.query(PlayerProfile).filter(PlayerProfile.id == interest_in.player_profile_id).first()
    if not player_profile:
        raise HTTPException(status_code=404, detail="Player profile not found.")
        
    # 3. Check for existing interest in this direction
    existing = db.query(Interest).filter(
        Interest.player_profile_id == interest_in.player_profile_id,
        Interest.guild_profile_id == interest_in.guild_profile_id,
        Interest.direction == "GUILD_TO_PLAYER"
    ).first()
    
    if existing:
        if existing.status in ["PENDING", "ACCEPTED"]:
            raise HTTPException(status_code=400, detail="Interest already expressed.")
        existing.status = "PENDING"
        existing.message = interest_in.message
        db.commit()
        db.refresh(existing)
        interest = existing
    else:
        interest = Interest(
            from_user_id=current_user.id,
            player_profile_id=interest_in.player_profile_id,
            guild_profile_id=interest_in.guild_profile_id,
            direction="GUILD_TO_PLAYER",
            status="PENDING",
            message=interest_in.message
        )
        db.add(interest)
        db.commit()
        db.refresh(interest)
        
    logger.info(f"Interest record created successfully (ID: {interest.id})")
    
    # 4. Check for reciprocal interest (Player-to-Guild) that is PENDING
    reciprocal = db.query(Interest).filter(
        Interest.player_profile_id == interest_in.player_profile_id,
        Interest.guild_profile_id == interest_in.guild_profile_id,
        Interest.direction == "PLAYER_TO_GUILD",
        Interest.status == "PENDING"
    ).first()
    
    if reciprocal:
        logger.info("Reciprocal player-to-guild interest detected! Creating a mutual match.")
        interest.status = "ACCEPTED"
        reciprocal.status = "ACCEPTED"
        
        # Create match
        match = Match(
            player_profile_id=interest_in.player_profile_id,
            guild_profile_id=interest_in.guild_profile_id,
            status="ACTIVE"
        )
        db.add(match)
        db.commit()
        
        # Notify both sides
        await create_db_notification_and_push(
            db, player_profile.user_id, "match_created",
            "Mutual Match Created!",
            f"You matched with <{guild_profile.guild_name}>-{guild_profile.realm}!",
            {"match_id": match.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
        )
        await create_db_notification_and_push(
            db, current_user.id, "match_created",
            "Mutual Match Created!",
            f"You matched with {player_profile.character_name}-{player_profile.realm}!",
            {"match_id": match.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
        )
    else:
        # Notify player of incoming guild recruiter interest
        await create_db_notification_and_push(
            db, player_profile.user_id, "interest_received",
            "Guild Recruiter Interest!",
            f"<{guild_profile.guild_name}> ({guild_profile.progression_label}) is interested in recruiting you.",
            {"interest_id": interest.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
        )
        
    return interest


@router.post("/{id}/accept", response_model=InterestResponse)
async def accept_interest(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts an incoming recruitment interest, creating a mutual Match.
    """
    logger.info(f"User {current_user.username} accepting interest ID {id}.")
    interest = db.query(Interest).filter(Interest.id == id, Interest.status == "PENDING").first()
    if not interest:
        raise HTTPException(status_code=404, detail="Pending interest record not found.")
        
    # Check if current user is the recipient of the interest
    is_recipient = False
    if interest.direction == "PLAYER_TO_GUILD":
        # Recipient is guild owner
        guild = db.query(GuildProfile).filter(
            GuildProfile.id == interest.guild_profile_id,
            GuildProfile.owner_user_id == current_user.id
        ).first()
        if guild:
            is_recipient = True
    elif interest.direction == "GUILD_TO_PLAYER":
        # Recipient is player owner
        player = db.query(PlayerProfile).filter(
            PlayerProfile.id == interest.player_profile_id,
            PlayerProfile.user_id == current_user.id
        ).first()
        if player:
            is_recipient = True
            
    if not is_recipient:
        raise HTTPException(status_code=403, detail="You are not authorized to accept this interest.")
        
    interest.status = "ACCEPTED"
    
    # Check if reciprocal interest also exists and update it
    reciprocal_direction = "GUILD_TO_PLAYER" if interest.direction == "PLAYER_TO_GUILD" else "PLAYER_TO_GUILD"
    reciprocal = db.query(Interest).filter(
        Interest.player_profile_id == interest.player_profile_id,
        Interest.guild_profile_id == interest.guild_profile_id,
        Interest.direction == reciprocal_direction
    ).first()
    
    if reciprocal:
        reciprocal.status = "ACCEPTED"
    else:
        # Create a reciprocal interest in accepted state to maintain double direction records
        reciprocal = Interest(
            from_user_id=current_user.id,
            player_profile_id=interest.player_profile_id,
            guild_profile_id=interest.guild_profile_id,
            direction=reciprocal_direction,
            status="ACCEPTED"
        )
        db.add(reciprocal)
        
    # Create Match
    # Check if match already exists
    match = db.query(Match).filter(
        Match.player_profile_id == interest.player_profile_id,
        Match.guild_profile_id == interest.guild_profile_id
    ).first()
    
    if not match:
        match = Match(
            player_profile_id=interest.player_profile_id,
            guild_profile_id=interest.guild_profile_id,
            status="ACTIVE"
        )
        db.add(match)
        
    db.commit()
    db.refresh(interest)
    
    player_profile = db.query(PlayerProfile).filter(PlayerProfile.id == interest.player_profile_id).first()
    guild_profile = db.query(GuildProfile).filter(GuildProfile.id == interest.guild_profile_id).first()
    
    # Notify both sides
    target_user_a = player_profile.user_id
    target_user_b = guild_profile.owner_user_id
    
    await create_db_notification_and_push(
        db, target_user_a, "match_created",
        "Mutual Match Created!",
        f"You matched with <{guild_profile.guild_name}>-{guild_profile.realm}!",
        {"match_id": match.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
    )
    await create_db_notification_and_push(
        db, target_user_b, "match_created",
        "Mutual Match Created!",
        f"You matched with {player_profile.character_name}-{player_profile.realm}!",
        {"match_id": match.id, "player_profile_id": player_profile.id, "guild_profile_id": guild_profile.id}
    )
    
    return interest


@router.post("/{id}/decline", response_model=InterestResponse)
def decline_interest(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Declines an incoming recruitment interest.
    """
    logger.info(f"User {current_user.username} declining interest ID {id}.")
    interest = db.query(Interest).filter(Interest.id == id, Interest.status == "PENDING").first()
    if not interest:
        raise HTTPException(status_code=404, detail="Pending interest record not found.")
        
    # Check if current user is the recipient
    is_recipient = False
    if interest.direction == "PLAYER_TO_GUILD":
        guild = db.query(GuildProfile).filter(
            GuildProfile.id == interest.guild_profile_id,
            GuildProfile.owner_user_id == current_user.id
        ).first()
        if guild:
            is_recipient = True
    elif interest.direction == "GUILD_TO_PLAYER":
        player = db.query(PlayerProfile).filter(
            PlayerProfile.id == interest.player_profile_id,
            PlayerProfile.user_id == current_user.id
        ).first()
        if player:
            is_recipient = True
            
    if not is_recipient:
        raise HTTPException(status_code=403, detail="You are not authorized to decline this interest.")
        
    interest.status = "DECLINED"
    db.commit()
    db.refresh(interest)
    
    return interest


@router.post("/{id}/withdraw", response_model=InterestResponse)
def withdraw_interest(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Withdraws interest previously expressed by the user.
    """
    logger.info(f"User {current_user.username} withdrawing interest ID {id}.")
    interest = db.query(Interest).filter(
        Interest.id == id,
        Interest.from_user_id == current_user.id,
        Interest.status == "PENDING"
    ).first()
    
    if not interest:
        raise HTTPException(status_code=404, detail="Active pending interest record not found for this user.")
        
    interest.status = "WITHDRAWN"
    db.commit()
    db.refresh(interest)
    
    return interest
