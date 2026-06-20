"""add discord webhook url to guild profiles

Revision ID: 9c1d2e3
Revises: 8b9c0d1
Create Date: 2026-06-20 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9c1d2e3'
down_revision: Union[str, None] = '8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('guild_profiles', sa.Column('discord_webhook_url', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('guild_profiles', 'discord_webhook_url')
