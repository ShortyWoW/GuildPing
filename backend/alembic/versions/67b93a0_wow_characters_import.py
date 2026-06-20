"""wow characters import fields

Revision ID: 67b93a0
Revises: f5e4d3c
Create Date: 2026-06-20 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '67b93a0'
down_revision: Union[str, None] = 'f5e4d3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add battlenet_access_token to users table
    op.add_column('users', sa.Column('battlenet_access_token', sa.String(), nullable=True))
    
    # 2. Add is_verified and blizzard_character_id to player_profiles table
    op.add_column('player_profiles', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('player_profiles', sa.Column('blizzard_character_id', sa.Integer(), nullable=True))

def downgrade() -> None:
    # 1. Drop columns from player_profiles table
    op.drop_column('player_profiles', 'blizzard_character_id')
    op.drop_column('player_profiles', 'is_verified')
    
    # 2. Drop battlenet_access_token from users table
    op.drop_column('users', 'battlenet_access_token')
