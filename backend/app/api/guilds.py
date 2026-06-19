from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.user import User
from app.models.profile import GuildProfile
from app.schemas.profile import GuildProfileCreate, GuildProfileUpdate, GuildProfileResponse
from app.api.auth import get_current_user
from app.core.logging import logger

router = APIRouter(prefix="/guilds", tags=["guilds"])

@router.post("", response_model=GuildProfileResponse, status_code=status.HTTP_201_CREATED)
def create_guild_profile(
    profile_in: GuildProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new Guild Profile for the authenticated user.
    """
    logger.info(f"User {current_user.username} is creating guild profile '{profile_in.guild_name}' on {profile_in.realm}.")
    
    # Store schedules and needs validation details as dictionary/JSON
    schedule_dict = profile_in.raid_schedule.model_dump()
    needs_dict = profile_in.needs.model_dump()
    
    db_profile = GuildProfile(
        owner_user_id=current_user.id,
        guild_name=profile_in.guild_name,
        realm=profile_in.realm,
        region=profile_in.region,
        faction=profile_in.faction,
        recruitment_status=profile_in.recruitment_status,
        progression_label=profile_in.progression_label,
        goals=profile_in.goals,
        raid_schedule=schedule_dict,
        needs=needs_dict,
        description=profile_in.description,
        discord_invite=profile_in.discord_invite,
        website_url=profile_in.website_url,
        visibility=profile_in.visibility
    )
    
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    
    logger.info(f"Guild profile '{db_profile.guild_name}' created successfully (ID: {db_profile.id}).")
    return db_profile


@router.get("", response_model=List[GuildProfileResponse])
def search_guilds(
    region: Optional[str] = None,
    realm: Optional[str] = None,
    faction: Optional[str] = None,
    recruitment_status: Optional[str] = None,
    goals: Optional[str] = None,  # comma-separated goals
    raid_day: Optional[int] = None,
    role_need: Optional[str] = None,  # e.g., "Tank", "Healer", "DPS"
    class_need: Optional[str] = None,  # e.g., "Mage", "Priest"
    db: Session = Depends(get_db)
):
    """
    Queries, filters, and browses public Guild Profiles.
    """
    logger.info("Search guilds request received with active filters.")
    query = db.query(GuildProfile).filter(GuildProfile.visibility == "PUBLIC")
    
    if region:
        query = query.filter(GuildProfile.region == region)
    if realm:
        query = query.filter(GuildProfile.realm.ilike(realm))
    if faction:
        query = query.filter(GuildProfile.faction == faction)
    if recruitment_status:
        query = query.filter(GuildProfile.recruitment_status == recruitment_status)
        
    results = query.all()
    
    # Post-filtering for JSON-based raid schedules and needs
    if goals:
        goals_list = [g.strip().lower() for g in goals.split(",")]
        results = [
            r for r in results 
            if any(goal.lower() in [rg.lower() for rg in r.goals] for goal in goals_list)
        ]
        
    if raid_day is not None:
        results = [
            r for r in results 
            if raid_day in r.raid_schedule.get("days", [])
        ]
        
    if role_need:
        results = [
            r for r in results 
            if role_need.lower() in [role.lower() for role in r.needs.get("roles", [])]
        ]
        
    if class_need:
        results = [
            r for r in results 
            if class_need.lower() in [cls.lower() for cls in r.needs.get("classes", [])]
        ]
        
    return results


@router.get("/{id}", response_model=GuildProfileResponse)
def get_guild_profile(id: int, db: Session = Depends(get_db)):
    """
    Retrieves a specific Guild Profile by its unique ID.
    """
    profile = db.query(GuildProfile).filter(GuildProfile.id == id).first()
    if not profile:
        logger.warning(f"Guild profile with ID {id} not found.")
        raise HTTPException(status_code=404, detail="Guild profile not found.")
    return profile


@router.put("/{id}", response_model=GuildProfileResponse)
def update_guild_profile(
    id: int,
    profile_update: GuildProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates an existing Guild Profile. Only the owner/creator can modify their profile.
    """
    logger.info(f"Update guild profile ID {id} requested by user {current_user.username}.")
    db_profile = db.query(GuildProfile).filter(GuildProfile.id == id).first()
    
    if not db_profile:
        raise HTTPException(status_code=404, detail="Guild profile not found.")
        
    # Validate ownership
    if db_profile.owner_user_id != current_user.id:
        logger.warning(f"Unauthorized update attempt on guild ID {id} by user ID {current_user.id}.")
        raise HTTPException(status_code=403, detail="You do not own this guild profile.")
        
    # Update fields dynamically
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["raid_schedule", "needs"] and value is not None:
            # Pydantic schema validation dict
            setattr(db_profile, field, value.model_dump() if hasattr(value, 'model_dump') else value)
        else:
            setattr(db_profile, field, value)
            
    db.commit()
    db.refresh(db_profile)
    
    logger.info(f"Guild profile '{db_profile.guild_name}' updated successfully.")
    return db_profile


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guild_profile(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a Guild Profile. Only the owner/creator can delete their profile.
    """
    logger.info(f"Delete guild profile ID {id} requested by user {current_user.username}.")
    db_profile = db.query(GuildProfile).filter(GuildProfile.id == id).first()
    
    if not db_profile:
        raise HTTPException(status_code=404, detail="Guild profile not found.")
        
    # Validate ownership
    if db_profile.owner_user_id != current_user.id:
        logger.warning(f"Unauthorized delete attempt on guild ID {id} by user ID {current_user.id}.")
        raise HTTPException(status_code=403, detail="You do not own this guild profile.")
        
    db.delete(db_profile)
    db.commit()
    
    logger.info(f"Guild profile ID {id} deleted successfully.")
