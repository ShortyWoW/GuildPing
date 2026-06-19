from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.logging import logger

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
