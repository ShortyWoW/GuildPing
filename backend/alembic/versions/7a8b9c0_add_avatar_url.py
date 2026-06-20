"""add avatar url to player profiles

Revision ID: 7a8b9c0
Revises: 67b93a0
Create Date: 2026-06-20 19:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7a8b9c0'
down_revision: Union[str, None] = '67b93a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('player_profiles', sa.Column('avatar_url', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('player_profiles', 'avatar_url')
