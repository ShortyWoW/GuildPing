import os
import sys
from datetime import datetime, timezone

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.profile import PlayerProfile, GuildProfile
from app.models.match import Interest, Match
from app.models.message import Message
from app.models.notification import Notification

def seed_db():
    print("Initializing database connection...")
    db: Session = SessionLocal()
    try:
        # Check if users already exist
        existing_user = db.query(User).filter(User.email == "player1@guildping.com").first()
        if existing_user:
            print("Database already contains seed data. Skipping seed script.")
            return

        print("Seeding Users...")
        # 1. Create Users
        user1 = User(
            email="player1@guildping.com",
            username="ArthasLover",
            password_hash=get_password_hash("password123"),
            is_active=True,
            is_admin=False
        )
        user2 = User(
            email="player2@guildping.com",
            username="UtherTheLight",
            password_hash=get_password_hash("password123"),
            is_active=True,
            is_admin=False
        )
        recruiter = User(
            email="recruiter@guildping.com",
            username="ThrallGorr",
            password_hash=get_password_hash("password123"),
            is_active=True,
            is_admin=True
        )

        db.add_all([user1, user2, recruiter])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        db.refresh(recruiter)
        print(f"Users seeded: user1(ID: {user1.id}), user2(ID: {user2.id}), recruiter(ID: {recruiter.id})")

        print("Seeding Player Profiles...")
        # 2. Create Player Profiles
        player1 = PlayerProfile(
            user_id=user1.id,
            character_name="FrostyDK",
            realm="Illidan",
            region="US",
            faction="Horde",
            class_name="Death Knight",
            spec_name="Frost",
            role="DPS",
            item_level=532,
            recruitment_status="LOOKING",
            goals=["Mythic", "Cutting Edge"],
            availability={
                "days": [1, 2, 3],  # Mon, Tue, Wed
                "start_time": "20:00",
                "end_time": "23:00",
                "timezone": "EST"
            },
            transfer_willing=True,
            faction_change_willing=False,
            bio="Veteran mythic raider looking for a CE team. 8/8H, 4/8M current tier. Can maintain 98%+ attendance.",
            discord_handle="frostydk#1111",
            battle_tag="Frosty#1234",
            visibility="PUBLIC"
        )

        player2 = PlayerProfile(
            user_id=user2.id,
            character_name="HolyUther",
            realm="Sargeras",
            region="US",
            faction="Alliance",
            class_name="Paladin",
            spec_name="Holy",
            role="Healer",
            item_level=529,
            recruitment_status="OPEN_TO_OFFERS",
            goals=["AOTC", "Mythic"],
            availability={
                "days": [2, 4],  # Tue, Thu
                "start_time": "19:30",
                "end_time": "22:30",
                "timezone": "EST"
            },
            transfer_willing=False,
            faction_change_willing=True,
            bio="Casual mythic/heroic healer looking for a mature and friendly team. Played Holy Paladin since WotLK.",
            discord_handle="utherholy#2222",
            battle_tag="Uther#5678",
            visibility="PUBLIC"
        )

        player3 = PlayerProfile(
            user_id=recruiter.id,
            character_name="GreenJesus",
            realm="Illidan",
            region="US",
            faction="Horde",
            class_name="Shaman",
            spec_name="Restoration",
            role="Healer",
            item_level=515,
            recruitment_status="NOT_LOOKING",
            goals=["Casual"],
            availability={
                "days": [0, 6],  # Sun, Sat
                "start_time": "15:00",
                "end_time": "18:00",
                "timezone": "EST"
            },
            transfer_willing=False,
            faction_change_willing=False,
            bio="Just a casual recruiter alt character.",
            discord_handle="thrall#3333",
            battle_tag="Thrall#9999",
            visibility="PUBLIC"
        )

        db.add_all([player1, player2, player3])
        db.commit()
        db.refresh(player1)
        db.refresh(player2)
        db.refresh(player3)
        print("Player Profiles seeded.")

        print("Seeding Guild Profiles...")
        # 3. Create Guild Profiles
        guild1 = GuildProfile(
            owner_user_id=recruiter.id,
            guild_name="Lordaeron Vanguard",
            realm="Sargeras",
            region="US",
            faction="Alliance",
            recruitment_status="RECRUITING",
            progression_label="8/8H, 2/8M",
            goals=["AOTC", "Mythic"],
            raid_schedule={
                "days": [2, 4],  # Tue, Thu
                "start_time": "19:30",
                "end_time": "22:30",
                "timezone": "EST"
            },
            needs={
                "roles": ["Healer"],
                "classes": ["Paladin"]
            },
            description="Active Alliance progression guild with a friendly social atmosphere. Always looking for reliable players.",
            discord_invite="https://discord.gg/lordaeron-van",
            website_url="https://lordaeronvanguard.com",
            visibility="PUBLIC"
        )

        guild2 = GuildProfile(
            owner_user_id=recruiter.id,
            guild_name="Frozen Throne Raiders",
            realm="Illidan",
            region="US",
            faction="Horde",
            recruitment_status="RECRUITING",
            progression_label="8/8M CE",
            goals=["Mythic", "Cutting Edge"],
            raid_schedule={
                "days": [1, 2, 3],  # Mon, Tue, Wed
                "start_time": "20:00",
                "end_time": "23:00",
                "timezone": "EST"
            },
            needs={
                "roles": ["DPS"],
                "classes": ["Death Knight", "Mage"]
            },
            description="Semi-hardcore Cutting Edge focused raid guild. High expectations, clean coordination, minimal downtime.",
            discord_invite="https://discord.gg/ft-raiders",
            website_url="https://frozenthrone.gg",
            visibility="PUBLIC"
        )

        guild3 = GuildProfile(
            owner_user_id=user1.id, # Player 1 owns a fun alt guild
            guild_name="Horde Legends",
            realm="Illidan",
            region="US",
            faction="Horde",
            recruitment_status="SELECTIVE",
            progression_label="8/8 Normal",
            goals=["Casual"],
            raid_schedule={
                "days": [0, 6],  # Sun, Sat
                "start_time": "15:00",
                "end_time": "18:00",
                "timezone": "EST"
            },
            needs={
                "roles": ["Tank", "Healer"],
                "classes": ["Shaman", "Druid"]
            },
            description="Weekend casual guild doing normal/heroic runs and mythic+ dungeons together.",
            discord_invite="https://discord.gg/horde-legends",
            visibility="PUBLIC"
        )

        db.add_all([guild1, guild2, guild3])
        db.commit()
        db.refresh(guild1)
        db.refresh(guild2)
        db.refresh(guild3)
        print("Guild Profiles seeded.")

        print("Seeding Interests and Matches...")
        # 4. Create Interest & Matches
        # Match 1: Player 1 <---> Guild 2 (CE DK & CE Guild)
        interest1_a = Interest(
            from_user_id=user1.id,
            player_profile_id=player1.id,
            guild_profile_id=guild2.id,
            direction="PLAYER_TO_GUILD",
            status="ACCEPTED",
            message="Hey! Saw you need a Frost DK. I've got logs and past CE achievements ready."
        )
        interest1_b = Interest(
            from_user_id=recruiter.id,
            player_profile_id=player1.id,
            guild_profile_id=guild2.id,
            direction="GUILD_TO_PLAYER",
            status="ACCEPTED",
            message="Hey, logs look great. We'd love to match and trial you next Monday."
        )
        match1 = Match(
            player_profile_id=player1.id,
            guild_profile_id=guild2.id,
            status="ACTIVE"
        )

        # Match 2: Player 2 <---> Guild 1 (Holy Pally & Alliance Guild)
        interest2_a = Interest(
            from_user_id=user2.id,
            player_profile_id=player2.id,
            guild_profile_id=guild1.id,
            direction="PLAYER_TO_GUILD",
            status="ACCEPTED",
            message="Holy Paladin looking for a solid raid team for heroic/mythic."
        )
        interest2_b = Interest(
            from_user_id=recruiter.id,
            player_profile_id=player2.id,
            guild_profile_id=guild1.id,
            direction="GUILD_TO_PLAYER",
            status="ACCEPTED"
        )
        match2 = Match(
            player_profile_id=player2.id,
            guild_profile_id=guild1.id,
            status="ACTIVE"
        )

        # Pending Interest: Guild 1 Recruiter is interested in Player 3 (GreenJesus)
        interest_pending = Interest(
            from_user_id=recruiter.id,
            player_profile_id=player3.id,
            guild_profile_id=guild1.id,
            direction="GUILD_TO_PLAYER",
            status="PENDING",
            message="Hey, would you be interested in healing for our second raid group?"
        )

        db.add_all([interest1_a, interest1_b, match1, interest2_a, interest2_b, match2, interest_pending])
        db.commit()
        db.refresh(match1)
        db.refresh(match2)
        db.refresh(interest_pending)
        print("Interests and Matches seeded.")

        print("Seeding Messages...")
        # 5. Seed Messages in Match 1 (FrostyDK & Frozen Throne Raiders)
        msg1 = Message(
            match_id=match1.id,
            sender_user_id=recruiter.id,
            body="Hey Frosty, welcome to the channel! Thanks for expressing interest. Your log rankings look excellent."
        )
        msg2 = Message(
            match_id=match1.id,
            sender_user_id=user1.id,
            body="Hi! Thanks for matching. I'm very excited about the spot. I raid clean, always bring consumables, and study tactics beforehand."
        )
        msg3 = Message(
            match_id=match1.id,
            sender_user_id=recruiter.id,
            body="That is exactly what we need. We're raiding this coming Monday @ 20:00 EST. Are you free to run a trial raid with us?"
        )
        msg4 = Message(
            match_id=match1.id,
            sender_user_id=user1.id,
            body="Absolutely! I will be online 15 minutes before raid time. See you then!"
        )

        db.add_all([msg1, msg2, msg3, msg4])
        db.commit()
        print("Messages seeded.")

        print("Seeding Notifications...")
        # 6. Seed Notifications
        # Recruiter gets notified about match with Player 1 & Player 2
        notif1 = Notification(
            user_id=recruiter.id,
            type="match_created",
            title="Mutual Match Created!",
            body="You matched with FrostyDK-Illidan!",
            payload={"match_id": match1.id, "player_profile_id": player1.id, "guild_profile_id": guild2.id},
            is_read=True
        )
        # Player 1 gets a notification about pending interest from Guild 1
        notif2 = Notification(
            user_id=user1.id,
            type="interest_received",
            title="Guild Recruiter Interest!",
            body="<Lordaeron Vanguard> (8/8H, 2/8M) is interested in recruiting your character HolyUther.",
            payload={"interest_id": interest_pending.id, "player_profile_id": player3.id, "guild_profile_id": guild1.id},
            is_read=False
        )

        db.add_all([notif1, notif2])
        db.commit()
        print("Notifications seeded.")

        print("Seeding complete! Database successfully populated.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}", file=sys.stderr)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
