from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from typing import Generator
from app.core.config import settings
from app.core.logging import logger

# SQLAlchemy session setup
# Connects synchronously using the psycopg driver
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Proactively pings DB to verify alive connections before queries
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator:
    """
    FastAPI dependency delivering transactional session scopes.
    Cleans up/closes the session when the HTTP request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
