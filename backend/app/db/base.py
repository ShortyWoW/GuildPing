# Import declarative base first
from app.db.session import Base

# Import all models here to register them for Alembic Autogenerate
from app.models.user import User
from app.models.profile import PlayerProfile, GuildProfile
from app.models.match import Interest, Match
from app.models.message import Message
from app.models.notification import Notification
