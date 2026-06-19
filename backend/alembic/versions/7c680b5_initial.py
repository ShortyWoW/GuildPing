"""initial

Revision ID: 7c680b5
Revises: 
Create Date: 2026-06-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7c680b5'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_admin', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 2. Player Profiles Table
    op.create_table(
        'player_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('character_name', sa.String(), nullable=False),
        sa.Column('realm', sa.String(), nullable=False),
        sa.Column('region', sa.String(), nullable=False),
        sa.Column('faction', sa.String(), nullable=False),
        sa.Column('class_name', sa.String(), nullable=False),
        sa.Column('spec_name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('item_level', sa.Integer(), nullable=True),
        sa.Column('recruitment_status', sa.String(), nullable=False),
        sa.Column('goals', sa.JSON(), nullable=False),
        sa.Column('availability', sa.JSON(), nullable=False),
        sa.Column('transfer_willing', sa.Boolean(), nullable=False),
        sa.Column('faction_change_willing', sa.Boolean(), nullable=False),
        sa.Column('bio', sa.String(), nullable=True),
        sa.Column('discord_handle', sa.String(), nullable=True),
        sa.Column('battle_tag', sa.String(), nullable=True),
        sa.Column('visibility', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_player_profiles_id'), 'player_profiles', ['id'], unique=False)

    # 3. Guild Profiles Table
    op.create_table(
        'guild_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_user_id', sa.Integer(), nullable=False),
        sa.Column('guild_name', sa.String(), nullable=False),
        sa.Column('realm', sa.String(), nullable=False),
        sa.Column('region', sa.String(), nullable=False),
        sa.Column('faction', sa.String(), nullable=False),
        sa.Column('recruitment_status', sa.String(), nullable=False),
        sa.Column('progression_label', sa.String(), nullable=False),
        sa.Column('goals', sa.JSON(), nullable=False),
        sa.Column('raid_schedule', sa.JSON(), nullable=False),
        sa.Column('needs', sa.JSON(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('discord_invite', sa.String(), nullable=True),
        sa.Column('website_url', sa.String(), nullable=True),
        sa.Column('visibility', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guild_profiles_id'), 'guild_profiles', ['id'], unique=False)

    # 4. Interests Table
    op.create_table(
        'interests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('from_user_id', sa.Integer(), nullable=False),
        sa.Column('player_profile_id', sa.Integer(), nullable=False),
        sa.Column('guild_profile_id', sa.Integer(), nullable=False),
        sa.Column('direction', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('message', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['from_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_profile_id'], ['player_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['guild_profile_id'], ['guild_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('player_profile_id', 'guild_profile_id', 'direction', name='uix_player_guild_direction')
    )
    op.create_index(op.f('ix_interests_id'), 'interests', ['id'], unique=False)

    # 5. Matches Table
    op.create_table(
        'matches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('player_profile_id', sa.Integer(), nullable=False),
        sa.Column('guild_profile_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['guild_profile_id'], ['guild_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_profile_id'], ['player_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('player_profile_id', 'guild_profile_id', name='uix_match_player_guild')
    )
    op.create_index(op.f('ix_matches_id'), 'matches', ['id'], unique=False)

    # 6. Messages Table
    op.create_table(
        'messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('match_id', sa.Integer(), nullable=False),
        sa.Column('sender_user_id', sa.Integer(), nullable=False),
        sa.Column('body', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_messages_id'), 'messages', ['id'], unique=False)

    # 7. Notifications Table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('body', sa.String(), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_messages_id'), table_name='messages')
    op.drop_table('messages')
    op.drop_index(op.f('ix_matches_id'), table_name='matches')
    op.drop_table('matches')
    op.drop_index(op.f('ix_interests_id'), table_name='interests')
    op.drop_table('interests')
    op.drop_index(op.f('ix_guild_profiles_id'), table_name='guild_profiles')
    op.drop_table('guild_profiles')
    op.drop_index(op.f('ix_player_profiles_id'), table_name='player_profiles')
    op.drop_table('player_profiles')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
