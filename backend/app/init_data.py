"""
Initialize database with sample data for STS Clearance system
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models import (ActivityLog, Approval, Document, DocumentType,
                        FeatureFlag, Message, Notification, Party, Room,
                        Snapshot, Vessel)


async def init_feature_flags(session: AsyncSession):
    """Initialize feature flags"""
    print("Initializing feature flags...")

    flags = [
        {"key": "cockpit_missing_expiring_docs", "enabled": True},
        {"key": "real_time_chat", "enabled": True},
        {"key": "document_approval_workflow", "enabled": True},
        {"key": "vessel_management", "enabled": True},
        {"key": "snapshot_generation", "enabled": True},
        {"key": "advanced_notifications", "enabled": True},
    ]

    for flag_data in flags:
        # Check if flag already exists
        result = await session.execute(
            select(FeatureFlag).where(FeatureFlag.key == flag_data["key"])
        )
        existing_flag = result.scalar_one_or_none()

        if not existing_flag:
            flag = FeatureFlag(key=flag_data["key"], enabled=flag_data["enabled"])
            session.add(flag)

    await session.commit()
    print("Feature flags initialized.")


async def init_document_types(session: AsyncSession):
    """Initialize document types"""
    print("Initializing document types...")

    doc_types = [
        {
            "code": "SAFETY_CERT",
            "name": "Safety Certificate",
            "required": True,
            "criticality": "high",
        },
        {
            "code": "INSURANCE",
            "name": "Insurance Certificate",
            "required": True,
            "criticality": "high",
        },
        {
            "code": "CREW_LIST",
            "name": "Crew List",
            "required": True,
            "criticality": "med",
        },
        {
            "code": "CARGO_MANIFEST",
            "name": "Cargo Manifest",
            "required": True,
            "criticality": "high",
        },
        {
            "code": "PORT_CLEARANCE",
            "name": "Port Clearance",
            "required": True,
            "criticality": "med",
        },
        {
            "code": "CUSTOMS_DOCS",
            "name": "Customs Documentation",
            "required": True,
            "criticality": "med",
        },
        {
            "code": "BUNKER_RECEIPT",
            "name": "Bunker Receipt",
            "required": False,
            "criticality": "low",
        },
        {
            "code": "WEATHER_ROUTING",
            "name": "Weather Routing",
            "required": False,
            "criticality": "low",
        },
        {
            "code": "STS_PLAN",
            "name": "STS Operation Plan",
            "required": True,
            "criticality": "high",
        },
        {
            "code": "EMERGENCY_PLAN",
            "name": "Emergency Response Plan",
            "required": True,
            "criticality": "high",
        },
    ]

    for doc_type_data in doc_types:
        # Check if document type already exists
        result = await session.execute(
            select(DocumentType).where(DocumentType.code == doc_type_data["code"])
        )
        existing_type = result.scalar_one_or_none()

        if not existing_type:
            doc_type = DocumentType(
                code=doc_type_data["code"],
                name=doc_type_data["name"],
                required=doc_type_data["required"],
                criticality=doc_type_data["criticality"],
            )
            session.add(doc_type)

    await session.commit()
    print("Document types initialized.")


async def init_sample_rooms(session: AsyncSession):
    """Initialize sample rooms with parties and documents"""
    print("Initializing sample rooms...")

    # Get document types
    doc_types_result = await session.execute(select(DocumentType))
    doc_types = doc_types_result.scalars().all()

    rooms_data = [
        {
            "title": "STS Operation Alpha - Mediterranean",
            "location": "Mediterranean Sea, 35°N 15°E",
            "sts_eta": datetime.utcnow() + timedelta(days=5),
            "created_by": "broker@maritime.com",
            "parties": [
                {
                    "role": "owner",
                    "name": "Mediterranean Shipping Co.",
                    "email": "owner@medship.com",
                },
                {
                    "role": "broker",
                    "name": "Global Maritime Brokers",
                    "email": "broker@maritime.com",
                },
                {
                    "role": "seller",
                    "name": "Petrol Trading Ltd.",
                    "email": "seller@petroltrading.com",
                },
                {
                    "role": "buyer",
                    "name": "Energy Solutions Inc.",
                    "email": "buyer@energysol.com",
                },
                {
                    "role": "charterer",
                    "name": "Charter Logistics",
                    "email": "charterer@charterlog.com",
                },
            ],
        },
        {
            "title": "STS Operation Beta - North Sea",
            "location": "North Sea, 56°N 3°E",
            "sts_eta": datetime.utcnow() + timedelta(days=12),
            "created_by": "owner@northsea.com",
            "parties": [
                {
                    "role": "owner",
                    "name": "North Sea Vessels",
                    "email": "owner@northsea.com",
                },
                {
                    "role": "broker",
                    "name": "Nordic Maritime Services",
                    "email": "broker@nordic.com",
                },
                {
                    "role": "seller",
                    "name": "Oil Traders AS",
                    "email": "seller@oiltraders.no",
                },
                {
                    "role": "buyer",
                    "name": "Refinery Corp",
                    "email": "buyer@refinery.com",
                },
            ],
        },
        {
            "title": "STS Operation Gamma - Gulf of Mexico",
            "location": "Gulf of Mexico, 27°N 90°W",
            "sts_eta": datetime.utcnow() + timedelta(days=8),
            "created_by": "demo@example.com",
            "parties": [
                {
                    "role": "owner",
                    "name": "Gulf Maritime LLC",
                    "email": "demo@example.com",
                },
                {
                    "role": "broker",
                    "name": "American Ship Brokers",
                    "email": "broker@amship.com",
                },
                {
                    "role": "seller",
                    "name": "Texas Oil Co.",
                    "email": "seller@texasoil.com",
                },
                {
                    "role": "buyer",
                    "name": "International Energy",
                    "email": "buyer@intenergy.com",
                },
            ],
        },
    ]

    for room_data in rooms_data:
        # Check if room already exists
        result = await session.execute(
            select(Room).where(Room.title == room_data["title"])
        )
        existing_room = result.first()

        if not existing_room:
            # Create room
            room = Room(
                title=room_data["title"],
                location=room_data["location"],
                sts_eta=room_data["sts_eta"],
                created_by=room_data["created_by"],
            )
            session.add(room)
            await session.flush()  # Get room ID

            # Add parties
            for party_data in room_data["parties"]:
                party = Party(
                    room_id=room.id,
                    role=party_data["role"],
                    name=party_data["name"],
                    email=party_data["email"],
                )
                session.add(party)

            # Create documents for each document type
            for doc_type in doc_types:
                # Randomly assign some documents as approved/under_review
                statuses = ["missing", "under_review", "approved"]
                weights = [0.3, 0.3, 0.4]  # 40% approved, 30% under review, 30% missing
                status = random.choices(statuses, weights=weights)[0]

                document = Document(
                    room_id=room.id,
                    type_id=doc_type.id,
                    status=status,
                    uploaded_by=(
                        random.choice(room_data["parties"])["email"]
                        if status != "missing"
                        else None
                    ),
                    uploaded_at=(
                        datetime.utcnow() - timedelta(days=random.randint(1, 10))
                        if status != "missing"
                        else None
                    ),
                    expires_on=(
                        datetime.utcnow() + timedelta(days=random.randint(30, 365))
                        if status == "approved"
                        else None
                    ),
                )
                session.add(document)

            # Add some sample vessels
            vessels_data = [
                {
                    "name": f"MV {room_data['title'].split()[2]} Star",
                    "vessel_type": "Bulk Carrier",
                    "flag": "Panama",
                    "imo": f"IMO{random.randint(1000000, 9999999)}",
                    "length": 180.5,
                    "beam": 32.2,
                    "draft": 12.8,
                    "gross_tonnage": 25000,
                    "built_year": 2015,
                },
                {
                    "name": f"MV {room_data['title'].split()[2]} Explorer",
                    "vessel_type": "Tanker",
                    "flag": "Marshall Islands",
                    "imo": f"IMO{random.randint(1000000, 9999999)}",
                    "length": 220.0,
                    "beam": 36.0,
                    "draft": 14.5,
                    "gross_tonnage": 45000,
                    "built_year": 2018,
                },
            ]

            for vessel_data in vessels_data:
                vessel = Vessel(
                    room_id=room.id,
                    name=vessel_data["name"],
                    vessel_type=vessel_data["vessel_type"],
                    flag=vessel_data["flag"],
                    imo=vessel_data["imo"],
                    length=vessel_data["length"],
                    beam=vessel_data["beam"],
                    draft=vessel_data["draft"],
                    gross_tonnage=vessel_data["gross_tonnage"],
                    built_year=vessel_data["built_year"],
                )
                session.add(vessel)

            # Add some activity logs
            activities = [
                {
                    "actor": room_data["created_by"],
                    "action": "room_created",
                    "meta": {"title": room_data["title"]},
                },
                {
                    "actor": random.choice(room_data["parties"])["email"],
                    "action": "document_uploaded",
                    "meta": {"document_type": "SAFETY_CERT"},
                },
                {
                    "actor": random.choice(room_data["parties"])["email"],
                    "action": "document_approved",
                    "meta": {"document_type": "INSURANCE"},
                },
                {
                    "actor": random.choice(room_data["parties"])["email"],
                    "action": "party_added",
                    "meta": {"party_role": "charterer"},
                },
            ]

            for activity_data in activities:
                activity = ActivityLog(
                    room_id=room.id,
                    actor=activity_data["actor"],
                    action=activity_data["action"],
                    meta_json=str(activity_data["meta"]),
                    ts=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                )
                session.add(activity)

    await session.commit()
    print("Sample rooms initialized.")


async def init_sample_messages(session: AsyncSession):
    """Initialize sample messages"""
    print("Initializing sample messages...")

    # Get first room
    room_result = await session.execute(select(Room).limit(1))
    room = room_result.scalar_one_or_none()

    if room:
        messages_data = [
            {
                "sender_email": "demo@example.com",
                "sender_name": "Demo User",
                "content": "Welcome to the STS Operation room! All parties have been added.",
                "message_type": "system",
            },
            {
                "sender_email": "broker@maritime.com",
                "sender_name": "Maritime Broker",
                "content": "Good morning everyone. I've uploaded the initial documentation. Please review and approve.",
                "message_type": "text",
            },
            {
                "sender_email": "owner@medship.com",
                "sender_name": "Ship Owner",
                "content": "Thanks for the update. I'll review the safety certificates today.",
                "message_type": "text",
            },
            {
                "sender_email": "seller@petroltrading.com",
                "sender_name": "Cargo Seller",
                "content": "The cargo manifest has been updated with the latest specifications.",
                "message_type": "text",
            },
        ]

        for msg_data in messages_data:
            message = Message(
                vessel_id=None,  # Add vessel_id field (nullable for room-wide messages)
                room_id=room.id,
                sender_email=msg_data["sender_email"],
                sender_name=msg_data["sender_name"],
                content=msg_data["content"],
                message_type=msg_data["message_type"],
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
            )
            session.add(message)

    await session.commit()
    print("Sample messages initialized.")


async def init_sample_notifications(session: AsyncSession):
    """Initialize sample notifications"""
    print("Initializing sample notifications...")

    notifications_data = [
        {
            "user_email": "demo@example.com",
            "title": "Document Uploaded",
            "message": "New safety certificate has been uploaded for review",
            "notification_type": "document_upload",
        },
        {
            "user_email": "demo@example.com",
            "title": "Approval Required",
            "message": "Your approval is required for STS Operation Alpha",
            "notification_type": "approval_required",
        },
        {
            "user_email": "demo@example.com",
            "title": "Document Expiring",
            "message": "Insurance certificate expires in 3 days",
            "notification_type": "document_expiring",
        },
    ]

    for notif_data in notifications_data:
        notification = Notification(
            user_email=notif_data["user_email"],
            title=notif_data["title"],
            message=notif_data["message"],
            notification_type=notif_data["notification_type"],
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
        )
        session.add(notification)

    await session.commit()
    print("Sample notifications initialized.")


async def main():
    """Main initialization function"""
    print("Starting database initialization...")

    async for session in get_async_session():
        try:
            await init_feature_flags(session)
            await init_document_types(session)
            await init_sample_rooms(session)
            # await init_sample_messages(session)  # Temporarily disabled
            await init_sample_notifications(session)

            print("Database initialization completed successfully!")

        except Exception as e:
            print(f"Error during initialization: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
        break


if __name__ == "__main__":
    asyncio.run(main())
