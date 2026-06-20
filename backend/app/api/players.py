from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx

from app.db.session import get_db
from app.models.user import User
from app.models.profile import PlayerProfile
from app.schemas.profile import PlayerProfileCreate, PlayerProfileUpdate, PlayerProfileResponse, CharacterImportRequest
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


CLASS_SPEC_ROLE_MAP = {
    ("death knight", "blood"): "Tank",
    ("death knight", "frost"): "DPS",
    ("death knight", "unholy"): "DPS",
    ("demon hunter", "havoc"): "DPS",
    ("demon hunter", "vengeance"): "Tank",
    ("druid", "guardian"): "Tank",
    ("druid", "restoration"): "Healer",
    ("druid", "feral"): "DPS",
    ("druid", "balance"): "DPS",
    ("evoker", "preservation"): "Healer",
    ("evoker", "devastation"): "DPS",
    ("evoker", "augmentation"): "DPS",
    ("hunter", "beast mastery"): "DPS",
    ("hunter", "marksmanship"): "DPS",
    ("hunter", "survival"): "DPS",
    ("mage", "arcane"): "DPS",
    ("mage", "fire"): "DPS",
    ("mage", "frost"): "DPS",
    ("monk", "brewmaster"): "Tank",
    ("monk", "mistweaver"): "Healer",
    ("monk", "windwalker"): "DPS",
    ("paladin", "protection"): "Tank",
    ("paladin", "holy"): "Healer",
    ("paladin", "retribution"): "DPS",
    ("priest", "discipline"): "Healer",
    ("priest", "holy"): "Healer",
    ("priest", "shadow"): "DPS",
    ("rogue", "assassination"): "DPS",
    ("rogue", "outlaw"): "DPS",
    ("rogue", "subtlety"): "DPS",
    ("shaman", "elemental"): "DPS",
    ("shaman", "enhancement"): "DPS",
    ("shaman", "restoration"): "Healer",
    ("warlock", "affliction"): "DPS",
    ("warlock", "demonology"): "DPS",
    ("warlock", "destruction"): "DPS",
    ("warrior", "protection"): "Tank",
    ("warrior", "arms"): "DPS",
    ("warrior", "fury"): "DPS"
}

@router.post("/import", response_model=PlayerProfileResponse, status_code=status.HTTP_201_CREATED)
async def import_player_profile(
    req: CharacterImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Imports and verifies a player character from the Blizzard WoW Profile API.
    """
    if not current_user.battlenet_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not linked to Battle.net. Please log in with Battle.net."
        )

    # Format slugs correctly for Blizzard API
    realm_slug = req.realm_slug.lower().strip().replace(" ", "-").replace("'", "")
    character_name_slug = req.character_name.lower().strip()
    region = req.region.lower().strip()

    url = f"https://{region}.api.blizzard.com/profile/wow/character/{realm_slug}/{character_name_slug}"
    headers = {
        "Authorization": f"Bearer {current_user.battlenet_access_token}"
    }
    params = {
        "namespace": f"profile-{region}",
        "locale": "en_US"
    }

    logger.info(f"Querying detailed profile from Blizzard API: {url}")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers, params=params)
            if res.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Battle.net token expired. Please re-authenticate."
                )
            if res.status_code != 200:
                logger.warning(f"Blizzard API returned {res.status_code}: {res.text}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Character {req.character_name} not found on realm {req.realm_slug} in region {req.region}."
                )
            
            data = res.json()
            
            # Query character media for avatar URL
            media_url = f"https://{region}.api.blizzard.com/profile/wow/character/{realm_slug}/{character_name_slug}/character-media"
            avatar_url = None
            try:
                media_res = await client.get(media_url, headers=headers, params=params)
                if media_res.status_code == 200:
                    media_data = media_res.json()
                    for asset in media_data.get("assets", []):
                        if asset.get("key") == "avatar":
                            avatar_url = asset.get("value")
                            break
                    if not avatar_url and "avatar_url" in media_data:
                        avatar_url = media_data["avatar_url"]
            except Exception as e:
                logger.warning(f"Failed to fetch avatar during import: {e}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error querying Blizzard Character Profile API: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to query details from Blizzard API."
            )

    # Parse details
    char_id = data.get("id")
    char_name = data.get("name")
    realm_name = data.get("realm", {}).get("name")
    faction_type = data.get("faction", {}).get("name", "Alliance")
    class_name = data.get("character_class", {}).get("name", "Unknown")
    spec_name = data.get("active_spec", {}).get("name", "Unknown")
    item_level = data.get("average_item_level", 0)

    # Map role
    mapped_role = CLASS_SPEC_ROLE_MAP.get((class_name.lower(), spec_name.lower()), req.role)

    # Create verified profile
    availability_dict = {
        "days": [],
        "start_time": "20:00",
        "end_time": "23:00",
        "timezone": "EST"
    }

    db_profile = PlayerProfile(
        user_id=current_user.id,
        character_name=char_name,
        realm=realm_name,
        region=req.region.upper(),
        faction=faction_type,
        class_name=class_name,
        spec_name=spec_name,
        role=mapped_role,
        item_level=item_level,
        is_verified=True,
        blizzard_character_id=char_id,
        avatar_url=avatar_url,
        recruitment_status="LOOKING",
        goals=["Mythic"],
        availability=availability_dict,
        transfer_willing=False,
        faction_change_willing=False,
        battle_tag=current_user.battlenet_tag,
        visibility="PUBLIC"
    )

    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)

    logger.info(f"Successfully imported and verified character {char_name}-{realm_name} (ID: {db_profile.id})")
    return db_profile


@router.post("/{id}/verify", response_model=PlayerProfileResponse)
async def verify_player_profile(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifies an existing manual Player Profile against the user's Battle.net character list.
    """
    db_profile = db.query(PlayerProfile).filter(PlayerProfile.id == id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Player profile not found.")

    if db_profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this profile.")

    if not current_user.battlenet_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not linked to Battle.net. Please log in with Battle.net."
        )

    # 1. Fetch user's character list index to verify they actually own this character name/realm
    region = db_profile.region.lower()
    index_url = f"https://{region}.api.blizzard.com/profile/user/wow"
    headers = {
        "Authorization": f"Bearer {current_user.battlenet_access_token}"
    }
    params = {
        "namespace": f"profile-{region}",
        "locale": "en_US"
    }

    async with httpx.AsyncClient() as client:
        try:
            index_res = await client.get(index_url, headers=headers, params=params)
            if index_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to query user character index from Blizzard."
                )
            index_data = index_res.json()
        except Exception as e:
            logger.error(f"Error querying Blizzard user index API: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error validating account ownership with Blizzard."
            )

    # Search index for matching character name & realm
    matched_char = None
    for account in index_data.get("wow_accounts", []):
        for char in account.get("characters", []):
            c_info = char.get("character", {})
            if (c_info.get("name", "").lower() == db_profile.character_name.lower() and
                c_info.get("realm", {}).get("slug", "").lower() == db_profile.realm.lower().strip().replace(" ", "-").replace("'", "")):
                matched_char = c_info
                break
        if matched_char:
            break

    if not matched_char:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This character could not be found on your Battle.net character list."
        )

    # 2. Fetch detailed profile to verify current level, item level, spec, class
    realm_slug = matched_char.get("realm", {}).get("slug")
    char_name_slug = matched_char.get("name").lower()
    detail_url = f"https://{region}.api.blizzard.com/profile/wow/character/{realm_slug}/{char_name_slug}"

    async with httpx.AsyncClient() as client:
        try:
            detail_res = await client.get(detail_url, headers=headers, params=params)
            if detail_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to fetch character details from Blizzard."
                )
            detail_data = detail_res.json()
        except Exception as e:
            logger.error(f"Error querying Blizzard character details API: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error fetching details from Blizzard."
            )

    # Update profile fields to match verified data
    db_profile.is_verified = True
    db_profile.blizzard_character_id = detail_data.get("id")
    db_profile.item_level = detail_data.get("average_item_level", db_profile.item_level)
    db_profile.class_name = detail_data.get("character_class", {}).get("name", db_profile.class_name)
    db_profile.spec_name = detail_data.get("active_spec", {}).get("name", db_profile.spec_name)
    db_profile.faction = detail_data.get("faction", {}).get("name", db_profile.faction)

    db.commit()
    db.refresh(db_profile)

    logger.info(f"Successfully verified existing player profile {db_profile.character_name}-{db_profile.realm} (ID: {db_profile.id})")
    return db_profile
