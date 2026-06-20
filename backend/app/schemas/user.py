from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    """
    Schema for account registration.
    """
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    """
    Schema for JSON-based login.
    """
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """
    Response schema containing safe user profile attributes.
    """
    id: int
    email: Optional[str] = None
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_seen_at: datetime
    battlenet_id: Optional[str] = None
    battlenet_tag: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    """
    Token payload delivered on successful authentication.
    """
    access_token: str
    token_type: str = "bearer"
