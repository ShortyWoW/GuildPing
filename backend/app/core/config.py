from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional

class Settings(BaseSettings):
    """
    App-wide configurations loaded from environment variables.
    """
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "production"
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://guildping:change_me_in_production@postgres:5432/guildping"
    
    # Redis Cache/Real-time Messaging Helper
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Security
    JWT_SECRET: str = "change_me_generate_long_random_jwt_secret_key_32_bytes_at_least"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    # CORS
    FRONTEND_URL: str = "http://localhost:8080"
    PUBLIC_SITE_URL: str = "http://localhost:8080"

    # Blizzard OAuth API Credentials
    BLIZZARD_CLIENT_ID: Optional[str] = None
    BLIZZARD_CLIENT_SECRET: Optional[str] = None

settings = Settings()
