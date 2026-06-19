from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Notification(Base):
    """
    User alerts for recruitment actions (new interest, matches, or chat activity).
    Stores notifications locally so users see them on reconnect/login.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    type = Column(String, nullable=False)  # interest_received, match_created, message_received
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    
    payload = Column(JSON, default=dict, nullable=False)  # stores details like profile ids, match id
    is_read = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="notifications")
