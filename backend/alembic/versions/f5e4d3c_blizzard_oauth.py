"""add blizzard oauth fields to users

Revision ID: f5e4d3c
Revises: 7c680b5
Create Date: 2026-06-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f5e4d3c'
down_revision: Union[str, None] = '7c680b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add columns to users table
    op.add_column('users', sa.Column('battlenet_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('battlenet_tag', sa.String(), nullable=True))
    
    # 2. Create index on battlenet_id
    op.create_index(op.f('ix_users_battlenet_id'), 'users', ['battlenet_id'], unique=True)
    
    # 3. Alter email and password_hash to make them nullable
    op.alter_column('users', 'email', existing_type=sa.String(), nullable=True)
    op.alter_column('users', 'password_hash', existing_type=sa.String(), nullable=True)

def downgrade() -> None:
    # 1. Revert email and password_hash to not nullable
    # Note: If there are nulls, this will fail in database, which is expected behavior for data safety.
    op.alter_column('users', 'password_hash', existing_type=sa.String(), nullable=False)
    op.alter_column('users', 'email', existing_type=sa.String(), nullable=False)
    
    # 2. Drop index and columns
    op.drop_index(op.f('ix_users_battlenet_id'), table_name='users')
    op.drop_column('users', 'battlenet_tag')
    op.drop_column('users', 'battlenet_id')
