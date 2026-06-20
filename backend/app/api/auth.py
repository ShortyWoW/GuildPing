from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
import httpx
import urllib.parse
import asyncio

def get_localized_name(val) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, dict):
        for locale in ["en_US", "en_GB", "de_DE", "es_ES", "fr_FR", "it_IT", "pl_PL", "ru_RU", "pt_BR", "ko_KR", "zh_TW", "zh_CN"]:
            if locale in val:
                return val[locale]
        return next(iter(val.values()))
    return str(val)

async def fetch_char_media(client, region, realm_slug, name_slug, headers, params) -> Optional[str]:
    media_url = f"https://{region}.api.blizzard.com/profile/wow/character/{realm_slug}/{name_slug}/character-media"
    try:
        res = await client.get(media_url, headers=headers, params=params, timeout=2.5)
        if res.status_code == 200:
            media_data = res.json()
            assets = media_data.get("assets", [])
            for asset in assets:
                if asset.get("key") == "avatar":
                    return asset.get("value")
            if "avatar_url" in media_data:
                return media_data["avatar_url"]
    except Exception as e:
        logger.warning(f"Failed to fetch media for {name_slug} on {realm_slug}: {e}")
    return None

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.logging import logger
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# Standard OAuth2 scheme pointing to login-form endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login-form", auto_error=False)

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> User:
    """
    HTTP Dependency that decodes the bearer JWT token and queries
    the database for the associated User record.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        logger.warning("Authentication request missing bearer token.")
        raise credentials_exception
        
    user_id = decode_access_token(token)
    if user_id is None:
        logger.warning("Decoded subject from token is invalid or expired.")
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        logger.warning(f"User with ID {user_id} not found in database.")
        raise credentials_exception
        
    if not user.is_active:
        logger.warning(f"User {user.username} is currently deactivated.")
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Update last_seen_at time periodically
    try:
        user.last_seen_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to update last_seen_at for user {user.id}: {e}")
        
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_217_CREATED if False else status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Creates a new user account if the email and username are not already registered.
    """
    logger.info(f"Register attempt for username: {user_in.username}, email: {user_in.email}")
    
    # Check if user already exists
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        logger.warning(f"Registration rejected: Email {user_in.email} is already taken.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )
        
    existing_username = db.query(User).filter(User.username == user_in.username).first()
    if existing_username:
        logger.warning(f"Registration rejected: Username {user_in.username} is already taken.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken."
        )
        
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        username=user_in.username,
        password_hash=hashed_pwd
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"User {user.username} registered successfully (ID: {user.id}).")
    return user


@router.post("/login", response_model=TokenResponse)
def login_json(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates a user via JSON payload and delivers a JWT token.
    """
    logger.info(f"Login attempt via JSON for email: {credentials.email}")
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = create_access_token(subject=user.id)
    logger.info(f"User {user.username} logged in successfully via JSON.")
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login-form", response_model=TokenResponse)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authenticates a user via standard form data (username maps to email or username)
    for Swagger documentation compatibility.
    """
    logger.info(f"Login attempt via Form for: {form_data.username}")
    
    # Allow username to check either username or email
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        logger.warning(f"Failed login attempt via Form for: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = create_access_token(subject=user.id)
    logger.info(f"User {user.username} logged in successfully via Form.")
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's details.
    """
    return current_user


@router.get("/blizzard/login")
def blizzard_login():
    """
    Redirects the user's browser to the Blizzard Battle.net OAuth authorize page.
    """
    if not settings.BLIZZARD_CLIENT_ID or not settings.BLIZZARD_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Blizzard OAuth is not configured on this server."
        )
    
    scope = "openid wow.profile"
    redirect_uri = f"{settings.PUBLIC_SITE_URL}/api/auth/blizzard/callback"
    state = "guildping_auth_flow"
    
    auth_url = (
        "https://oauth.battle.net/authorize"
        f"?client_id={settings.BLIZZARD_CLIENT_ID}"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&response_type=code"
        f"&scope={urllib.parse.quote(scope)}"
        f"&state={state}"
    )
    
    logger.info("Redirecting user to Blizzard OAuth authorize page.")
    return RedirectResponse(url=auth_url)


@router.get("/blizzard/callback")
async def blizzard_callback(code: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Handles the redirect callback from Blizzard.
    Exchanges the authorization code for an access token,
    queries the Battle.net user info endpoint,
    finds or registers the User, and redirects to the frontend with a JWT.
    """
    if not settings.BLIZZARD_CLIENT_ID or not settings.BLIZZARD_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Blizzard OAuth is not configured on this server."
        )
        
    redirect_uri = f"{settings.PUBLIC_SITE_URL}/api/auth/blizzard/callback"
    
    logger.info("Exchanging code for Blizzard access token.")
    
    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(
                "https://oauth.battle.net/token",
                data={
                    "client_id": settings.BLIZZARD_CLIENT_ID,
                    "client_secret": settings.BLIZZARD_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                },
                auth=(settings.BLIZZARD_CLIENT_ID, settings.BLIZZARD_CLIENT_SECRET)
            )
            
            if token_response.status_code != 200:
                logger.error(f"Failed token exchange from Blizzard: {token_response.text}")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=token_exchange_failed")
                
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                logger.error("Token exchange response did not contain access_token.")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=missing_access_token")
                
            userinfo_response = await client.get(
                "https://oauth.battle.net/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                logger.error(f"Failed to fetch userinfo from Blizzard: {userinfo_response.text}")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=profile_fetch_failed")
                
            userinfo = userinfo_response.json()
            battlenet_id = str(userinfo.get("sub") or userinfo.get("id"))
            battlenet_tag = userinfo.get("battletag")
            
            if not battlenet_id or not battlenet_tag:
                logger.error("Blizzard userinfo response did not contain ID or BattleTag.")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=invalid_profile_details")
                
        except Exception as e:
            logger.error(f"Exception during Blizzard OAuth token exchange / profile fetch: {e}")
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_error")
            
    # Find or Create User
    user = db.query(User).filter(User.battlenet_id == battlenet_id).first()
    
    if not user:
        logger.info(f"Registering new user via Blizzard OAuth: {battlenet_tag}")
        username = battlenet_tag.replace("#", "")
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            username = f"{username}_{battlenet_id[:5]}"
            
        user = User(
            email=None,
            username=username,
            password_hash=None,
            battlenet_id=battlenet_id,
            battlenet_tag=battlenet_tag,
            battlenet_access_token=access_token,
            is_active=True,
            is_admin=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        logger.info(f"Logging in existing user via Blizzard OAuth: {user.username}")
        user.battlenet_access_token = access_token
        if user.battlenet_tag != battlenet_tag:
            user.battlenet_tag = battlenet_tag
        db.commit()
        db.refresh(user)
            
    token = create_access_token(subject=user.id)
    redirect_url = f"{settings.FRONTEND_URL}/login?token={token}"
    return RedirectResponse(url=redirect_url)


@router.get("/blizzard/characters")
async def get_blizzard_characters(
    current_user: User = Depends(get_current_user),
    region: str = "us"
):
    """
    Retrieves the WoW characters associated with the user's Battle.net account.
    """
    if not current_user.battlenet_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not linked to Battle.net. Please login with Battle.net."
        )
        
    valid_regions = ["us", "eu", "kr", "tw"]
    if region.lower() not in valid_regions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid region. Must be one of {valid_regions}"
        )
        
    url = f"https://{region}.api.blizzard.com/profile/user/wow"
    headers = {
        "Authorization": f"Bearer {current_user.battlenet_access_token}"
    }
    params = {
        "namespace": f"profile-{region}",
        "locale": "en_US"
    }
    
    logger.info(f"Fetching Battle.net characters for user {current_user.username} in region {region}")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 401:
                logger.warning(f"Blizzard API returned 401 for user {current_user.username}. Token expired.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Battle.net session expired. Please log in again using Battle.net."
                )
                
            if response.status_code in [403, 404]:
                logger.info(f"User {current_user.username} has no active WoW account or access to region {region}.")
                return []
                
            if response.status_code != 200:
                logger.error(f"Blizzard API returned {response.status_code}: {response.text}")
                return []
                
            data = response.json()
            characters = []
            
            for account in data.get("wow_accounts", []):
                for char in account.get("characters", []):
                    c_info = char.get("character", {}) or {}
                    playable_class = char.get("playable_class", {}) or c_info.get("playable_class", {}) or {}
                    playable_race = char.get("playable_race", {}) or c_info.get("playable_race", {}) or {}
                    realm_data = char.get("realm") or c_info.get("realm") or {}
                    
                    char_id = char.get("id") or c_info.get("id")
                    char_name = get_localized_name(char.get("name")) or get_localized_name(c_info.get("name"))
                    level = char.get("level") or c_info.get("level")
                    realm_name = get_localized_name(realm_data.get("name"))
                    realm_slug = realm_data.get("slug")
                    class_name = get_localized_name(playable_class.get("name"))
                    race_name = get_localized_name(playable_race.get("name"))
                    
                    if char_name and realm_slug:
                        characters.append({
                            "id": char_id,
                            "name": char_name,
                            "level": level,
                            "realm": {
                                "name": realm_name,
                                "slug": realm_slug
                            },
                            "class_name": class_name,
                            "race_name": race_name,
                            "avatar_url": None
                        })
            # Sort characters by level descending (big to small)
            characters.sort(key=lambda c: c.get("level") or 0, reverse=True)

            # Fetch avatar URLs in parallel
            if characters:
                tasks = []
                for char in characters:
                    r_slug = char["realm"]["slug"]
                    n_slug = char["name"].lower().strip()
                    tasks.append(fetch_char_media(client, region, r_slug, n_slug, headers, params))
                
                avatars = await asyncio.gather(*tasks)
                for i, avatar in enumerate(avatars):
                    characters[i]["avatar_url"] = avatar
                    
            return characters
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error querying Blizzard Profile API: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An internal error occurred while communicating with Blizzard."
            )

@router.get("/debug-bnet")
async def debug_bnet(current_user: User = Depends(get_current_user)):
    if not current_user.battlenet_access_token:
        return {"error": "No battlenet token"}
    
    headers = {
        "Authorization": f"Bearer {current_user.battlenet_access_token}"
    }
    params = {
        "namespace": "profile-us",
        "locale": "en_US"
    }
    
    async with httpx.AsyncClient() as client:
        r1 = await client.get("https://us.api.blizzard.com/profile/wow/character/area-52/callmeshawte/guild-membership", headers=headers, params=params)
        r2 = await client.get("https://us.api.blizzard.com/profile/wow/character/area-52/callmeshawte", headers=headers, params=params)
        r3 = await client.get("https://us.api.blizzard.com/data/wow/guild/area-52/mythically-challenged/roster", headers=headers, params=params)
        
        return {
            "token": current_user.battlenet_access_token[:15] + "...",
            "guild_membership_status": r1.status_code,
            "guild_membership_body": r1.json() if r1.status_code == 200 else r1.text,
            "profile_status": r2.status_code,
            "profile_guild": r2.json().get("guild") if r2.status_code == 200 else r2.text,
            "roster_status": r3.status_code,
            "roster_body": r3.json() if r3.status_code == 200 else r3.text
        }

