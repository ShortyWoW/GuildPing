from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.user import User
from app.models.profile import PlayerProfile
from app.schemas.profile import PlayerProfileCreate, PlayerProfileUpdate, PlayerProfileResponse
from app.api.auth import get_current_user
from app.core.logging import logger

router = APIRouter(prefix="/players", tags=["players"])

@router.post("", response_model=PlayerProfileResponse, status_code=status.HTTP_201_CREATED)
def create_player_profile(
    profile_in: PlayerProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new World of Warcraft Player Profile for the authenticated user.
    """
    logger.info(f"User {current_user.username} is creating player profile for {profile_in.character_name}-{profile_in.realm}.")
    
    # Store availability validation details as dictionary/JSON
    availability_dict = profile_in.availability.model_dump()
    
    db_profile = PlayerProfile(
        user_id=current_user.id,
        character_name=profile_in.character_name,
        realm=profile_in.realm,
        region=profile_in.region,
        faction=profile_in.faction,
        class_name=profile_in.class_name,
        spec_name=profile_in.spec_name,
        role=profile_in.role,
        item_level=profile_in.item_level,
        recruitment_status=profile_in.recruitment_status,
        goals=profile_in.goals,
        availability=availability_dict,
        transfer_willing=profile_in.transfer_willing,
        faction_change_willing=profile_in.faction_change_willing,
        bio=profile_in.bio,
        discord_handle=profile_in.discord_handle,
        battle_tag=profile_in.battle_tag,
        visibility=profile_in.visibility
    )
    
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    
    logger.info(f"Player profile {db_profile.character_name} created successfully (ID: {db_profile.id}).")
    return db_profile


@router.get("", response_model=List[PlayerProfileResponse])
def search_players(
    class_name: Optional[str] = None,
    spec_name: Optional[str] = None,
    role: Optional[str] = None,
    region: Optional[str] = None,
    realm: Optional[str] = None,
    recruitment_status: Optional[str] = None,
    goals: Optional[str] = None,  # comma-separated filter e.g., "Mythic,AOTC"
    availability_day: Optional[int] = None,
    timezone: Optional[str] = None,
    transfer_willing: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Queries, filters, and browses public Player Profiles.
    """
    logger.info("Search players request received with active filters.")
    query = db.query(PlayerProfile).filter(PlayerProfile.visibility == "PUBLIC")
    
    if class_name:
        query = query.filter(PlayerProfile.class_name.ilike(class_name))
    if spec_name:
        query = query.filter(PlayerProfile.spec_name.ilike(spec_name))
    if role:
        query = query.filter(PlayerProfile.role == role)
    if region:
        query = query.filter(PlayerProfile.region == region)
    if realm:
        query = query.filter(PlayerProfile.realm.ilike(realm))
    if recruitment_status:
        query = query.filter(PlayerProfile.recruitment_status == recruitment_status)
    if transfer_willing is not None:
        query = query.filter(PlayerProfile.transfer_willing == transfer_willing)
        
    results = query.all()
    
    # Post-filtering for JSON-based availability and goals
    if goals:
        goals_list = [g.strip().lower() for g in goals.split(",")]
        results = [
            r for r in results 
            if any(goal.lower() in [rg.lower() for rg in r.goals] for goal in goals_list)
        ]
        
    if availability_day is not None:
        results = [
            r for r in results 
            if availability_day in r.availability.get("days", [])
        ]
        
    if timezone:
        results = [
            r for r in results 
            if r.availability.get("timezone", "").lower() == timezone.lower()
        ]
        
    return results


@router.get("/{id}", response_model=PlayerProfileResponse)
def get_player_profile(id: int, db: Session = Depends(get_db)):
    """
    Retrieves a specific Player Profile by its unique ID.
    """
    profile = db.query(PlayerProfile).filter(PlayerProfile.id == id).first()
    if not profile:
        logger.warning(f"Player profile with ID {id} not found.")
        raise HTTPException(status_code=404, detail="Player profile not found.")
    return profile


@router.put("/{id}", response_model=PlayerProfileResponse)
def update_player_profile(
    id: int,
    profile_update: PlayerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates an existing Player Profile. Only the owner can modify their profile.
    """
    logger.info(f"Update player profile ID {id} requested by user {current_user.username}.")
    db_profile = db.query(PlayerProfile).filter(PlayerProfile.id == id).first()
    
    if not db_profile:
        raise HTTPException(status_code=404, detail="Player profile not found.")
        
    # Validate ownership
    if db_profile.user_id != current_user.id:
        logger.warning(f"Unauthorized update attempt on profile ID {id} by user ID {current_user.id}.")
        raise HTTPException(status_code=403, detail="You do not own this profile.")
        
    # Update fields dynamically
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "availability" and value is not None:
            # Pydantic schema validation dict
            setattr(db_profile, field, value.model_dump() if hasattr(value, 'model_dump') else value)
        else:
            setattr(db_profile, field, value)
            
    db.commit()
    db.refresh(db_profile)
    
    logger.info(f"Player profile {db_profile.character_name} updated successfully.")
    return db_profile


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player_profile(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a Player Profile. Only the owner can delete their profile.
    """
    logger.info(f"Delete player profile ID {id} requested by user {current_user.username}.")
    db_profile = db.query(PlayerProfile).filter(PlayerProfile.id == id).first()
    
    if not db_profile:
        raise HTTPException(status_code=404, detail="Player profile not found.")
        
    # Validate ownership
    if db_profile.user_id != current_user.id:
        logger.warning(f"Unauthorized delete attempt on profile ID {id} by user ID {current_user.id}.")
        raise HTTPException(status_code=403, detail="You do not own this profile.")
        
    db.delete(db_profile)
    db.commit()
    
    logger.info(f"Player profile ID {id} deleted successfully.")
