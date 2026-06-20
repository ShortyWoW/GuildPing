"""add guild verification columns

Revision ID: 8b9c0d1
Revises: 7a8b9c0
Create Date: 2026-06-20 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8b9c0d1'
down_revision: Union[str, None] = '7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('guild_profiles', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('guild_profiles', sa.Column('blizzard_guild_id', sa.Integer(), nullable=True))

def downgrade() -> None:
    op.drop_column('guild_profiles', 'blizzard_guild_id')
    op.drop_column('guild_profiles', 'is_verified')
