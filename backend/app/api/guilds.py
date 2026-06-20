from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import asyncio

from app.db.session import get_db
from app.models.user import User
from app.models.profile import GuildProfile, PlayerProfile
from app.schemas.profile import GuildProfileCreate, GuildProfileUpdate, GuildProfileResponse, GuildImportRequest
from app.api.auth import get_current_user, get_localized_name
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


async def fetch_character_guilds(client, region, realm_slug, name_slug, headers, params, char_name):
    url = f"https://{region}.api.blizzard.com/profile/wow/character/{realm_slug}/{name_slug}"
    try:
        res = await client.get(url, headers=headers, params=params, timeout=3.0)
        if res.status_code == 200:
            char_data = res.json()
            guild_data = char_data.get("guild")
            if not guild_data:
                return []
                
            guild_name = get_localized_name(guild_data.get("name"))
            guild_id = guild_data.get("id")
            guild_realm = guild_data.get("realm", {})
            guild_realm_name = get_localized_name(guild_realm.get("name"))
            guild_realm_slug = guild_realm.get("slug")
            
            # Default rank
            rank = 99
            rank_name = "Member"
            
            # Query guild summary / roster to find actual rank
            guild_href = guild_data.get("key", {}).get("href", "")
            if guild_href:
                base_href = guild_href.split("?")[0]
                
                # First, check if the character is the leader using the guild summary endpoint
                try:
                    summary_res = await client.get(base_href, headers=headers, params=params, timeout=3.0)
                    if summary_res.status_code == 200:
                        summary_data = summary_res.json()
                        leader_data = summary_data.get("leader", {})
                        if leader_data.get("id") == char_data.get("id") or leader_data.get("name", "").lower() == char_name.lower():
                            rank = 0
                            rank_name = "Guild Leader"
                except Exception as summary_err:
                    logger.warning(f"Guild summary check failed: {summary_err}")
                
                # If they are not identified as leader (or guild summary check failed), fallback/check roster
                if rank != 0:
                    roster_url = f"{base_href}/roster"
                    try:
                        roster_res = await client.get(roster_url, headers=headers, params=params, timeout=3.0)
                        if roster_res.status_code == 200:
                            roster_data = roster_res.json()
                            for member_entry in roster_data.get("members", []):
                                member_char = member_entry.get("character", {})
                                if member_char.get("id") == char_data.get("id") or member_char.get("name", "").lower() == char_name.lower():
                                    rank = member_entry.get("rank", 99)
                                    rank_name = "Guild Leader" if rank == 0 else "Officer" if rank <= 2 else "Member"
                                    break
                        elif roster_res.status_code == 404:
                            # If roster is 404 due to new guild latency, default the importer to Guild Leader
                            rank = 0
                            rank_name = "Guild Leader"
                    except Exception as roster_err:
                        logger.warning(f"Roster check failed: {roster_err}")
                        # Fallback for connection/API errors to allow registration
                        rank = 0
                        rank_name = "Guild Leader"
            
            if guild_name and guild_realm_slug:
                return [{
                    "guild_name": guild_name,
                    "guild_id": guild_id,
                    "realm": guild_realm_name,
                    "realm_slug": guild_realm_slug,
                    "region": region.upper(),
                    "rank": rank,
                    "rank_name": rank_name,
                    "character_name": char_name
                }]
    except Exception as e:
        logger.warning(f"Failed to fetch guild membership for {name_slug} on {realm_slug}: {e}")
    return []


@router.get("/blizzard/importable", response_model=List[dict])
async def get_importable_guilds(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns a list of Blizzard guilds that the user can import, based on their verified characters.
    """
    if not current_user.battlenet_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not linked to Battle.net."
        )

    # Get all verified characters of this user
    verified_chars = db.query(PlayerProfile).filter(
        PlayerProfile.user_id == current_user.id,
        PlayerProfile.is_verified == True
    ).all()

    if not verified_chars:
        return []

    importable_guilds = []
    seen_guilds = set()

    headers = {
        "Authorization": f"Bearer {current_user.battlenet_access_token}"
    }

    async with httpx.AsyncClient() as client:
        tasks = []
        for char in verified_chars:
            region = char.region.lower()
            realm_slug = char.realm.lower().replace(" ", "-").replace("'", "")
            name_slug = char.character_name.lower()
            params = {
                "namespace": f"profile-{region}",
                "locale": "en_US"
            }
            tasks.append(fetch_character_guilds(client, region, realm_slug, name_slug, headers, params, char.character_name))
        
        results = await asyncio.gather(*tasks)
        for sublist in results:
            for g in sublist:
                key = (g["guild_name"].lower(), g["realm_slug"].lower(), g["region"].lower())
                if key not in seen_guilds:
                    seen_guilds.add(key)
                    char_profile = next((c for c in verified_chars if c.character_name == g["character_name"]), None)
                    g["faction"] = char_profile.faction if char_profile else "Alliance"
                    importable_guilds.append(g)

    return importable_guilds


@router.post("/import", response_model=GuildProfileResponse, status_code=status.HTTP_201_CREATED)
async def import_guild_profile(
    req: GuildImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Imports and verifies a WoW Guild Profile based on one of the user's verified characters.
    """
    if not current_user.battlenet_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not linked to Battle.net."
        )

    char_profile = db.query(PlayerProfile).filter(
        PlayerProfile.user_id == current_user.id,
        PlayerProfile.character_name.ilike(req.character_name),
        PlayerProfile.is_verified == True
    ).first()

    if not char_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not own a verified character named {req.character_name}."
        )

    region = req.region.lower().strip()
    realm_slug = req.realm_slug.lower().strip().replace(" ", "-").replace("'", "")
    character_name_slug = req.character_name.lower().strip()

    url = f"https://{region}.api.blizzard.com/profile/wow/character/{realm_slug}/{character_name_slug}"
    headers = {
        "Authorization": f"Bearer {current_user.battlenet_access_token}"
    }
    params = {
        "namespace": f"profile-{region}",
        "locale": "en_US"
    }

    is_member = False
    rank = 99
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers, params=params)
            if res.status_code == 200:
                char_data = res.json()
                guild_data = char_data.get("guild")
                if guild_data and guild_data.get("id") == req.guild_id:
                    is_member = True
                    
                    # Try to fetch actual rank from guild summary / roster
                    guild_href = guild_data.get("key", {}).get("href", "")
                    if guild_href:
                        base_href = guild_href.split("?")[0]
                        
                        # First, check if the character is the leader using the guild summary endpoint
                        try:
                            summary_res = await client.get(base_href, headers=headers, params=params, timeout=3.0)
                            if summary_res.status_code == 200:
                                summary_data = summary_res.json()
                                leader_data = summary_data.get("leader", {})
                                if leader_data.get("id") == char_data.get("id") or leader_data.get("name", "").lower() == req.character_name.lower():
                                    rank = 0
                        except Exception as summary_err:
                            logger.warning(f"Guild summary check failed during import: {summary_err}")
                        
                        # If not identified as leader, fallback/check roster
                        if rank != 0:
                            roster_url = f"{base_href}/roster"
                            try:
                                roster_res = await client.get(roster_url, headers=headers, params=params, timeout=3.0)
                                if roster_res.status_code == 200:
                                    roster_data = roster_res.json()
                                    for member_entry in roster_data.get("members", []):
                                        member_char = member_entry.get("character", {})
                                        if member_char.get("id") == char_data.get("id") or member_char.get("name", "").lower() == req.character_name.lower():
                                            rank = member_entry.get("rank", 99)
                                            break
                                elif roster_res.status_code == 404:
                                    # Fallback to Guild Leader for unindexed roster API
                                    rank = 0
                            except Exception as roster_err:
                                logger.warning(f"Roster check failed during import: {roster_err}")
                                # Fallback to Guild Leader for unindexed roster API
                                rank = 0
        except Exception as e:
            logger.error(f"Error checking guild membership via Blizzard API: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to query Blizzard API for guild membership verification."
            )

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Character {req.character_name} is not a member of '{req.guild_name}' according to Blizzard APIs."
        )

    existing_guild = db.query(GuildProfile).filter(
        GuildProfile.guild_name.ilike(req.guild_name),
        GuildProfile.realm.ilike(char_profile.realm),
        GuildProfile.region == req.region.upper()
    ).first()

    if existing_guild:
        if existing_guild.owner_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A profile for this guild has already been registered by another user."
            )
        
        existing_guild.is_verified = True
        existing_guild.blizzard_guild_id = req.guild_id
        db.commit()
        db.refresh(existing_guild)
        return existing_guild

    default_schedule = {
        "days": [],
        "start_time": "20:00",
        "end_time": "23:00",
        "timezone": "EST"
    }
    default_needs = {
        "roles": ["Healer", "DPS"],
        "classes": []
    }

    db_profile = GuildProfile(
        owner_user_id=current_user.id,
        guild_name=req.guild_name,
        realm=char_profile.realm,
        region=req.region.upper(),
        faction=char_profile.faction,
        is_verified=True,
        blizzard_guild_id=req.guild_id,
        recruitment_status="RECRUITING",
        progression_label="None",
        goals=["Casual"],
        raid_schedule=default_schedule,
        needs=default_needs,
        description=f"Recruitment profile for <{req.guild_name}> on {char_profile.realm}.",
        visibility="PUBLIC"
    )

    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)

    logger.info(f"Successfully imported and verified Guild Profile '{req.guild_name}' (ID: {db_profile.id})")
    return db_profile
