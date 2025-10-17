#!/usr/bin/env python3
"""
Create test STS operations (rooms) for admin user
This script creates sample STS operations that users can select from after login
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import get_async_session
from app.models import Room, Party, Vessel, User
from sqlalchemy import select


async def create_test_rooms():
    """Create test STS operations with vessels and parties"""

    async for session in get_async_session():
        try:
            print("Creating test STS operations...")

            # Check if rooms already exist
            result = await session.execute(select(Room))
            existing_rooms = result.scalars().all()
            if existing_rooms:
                print(f"Found {len(existing_rooms)} existing rooms, skipping creation")
                return

            # Create test operations
            operations = [
                {
                    "title": "STS Operation - Singapore Strait",
                    "location": "Singapore Strait",
                    "sts_eta": datetime.utcnow() + timedelta(days=2),
                    "description": "Ship-to-Ship transfer operation in Singapore Strait",
                    "vessels": [
                        {
                            "name": "MT Pacific Glory",
                            "vessel_type": "Oil Tanker",
                            "flag": "Panama",
                            "imo": "9876543",
                            "owner": "Pacific Shipping Ltd",
                            "charterer": "Global Energy Corp",
                            "length": 250.0,
                            "beam": 44.0,
                            "draft": 15.5,
                            "gross_tonnage": 65000,
                        },
                        {
                            "name": "MT Atlantic Star",
                            "vessel_type": "Oil Tanker",
                            "flag": "Liberia",
                            "imo": "9876544",
                            "owner": "Atlantic Marine",
                            "charterer": "Global Energy Corp",
                            "length": 240.0,
                            "beam": 42.0,
                            "draft": 14.8,
                            "gross_tonnage": 62000,
                        }
                    ],
                    "parties": [
                        {"role": "owner", "name": "Pacific Shipping Ltd", "email": "owner@pacific.com"},
                        {"role": "charterer", "name": "Global Energy Corp", "email": "ops@globalenergy.com"},
                        {"role": "broker", "name": "STS Brokers Inc", "email": "broker@stsbrokers.com"},
                    ]
                },
                {
                    "title": "STS Operation - Gulf of Mexico",
                    "location": "Gulf of Mexico",
                    "sts_eta": datetime.utcnow() + timedelta(days=5),
                    "description": "Offshore STS transfer in Gulf of Mexico",
                    "vessels": [
                        {
                            "name": "MT Gulf Explorer",
                            "vessel_type": "Chemical Tanker",
                            "flag": "Marshall Islands",
                            "imo": "9876545",
                            "owner": "Gulf Shipping Co",
                            "charterer": "PetroChem Industries",
                            "length": 180.0,
                            "beam": 32.0,
                            "draft": 12.2,
                            "gross_tonnage": 25000,
                        },
                        {
                            "name": "MT Petro Carrier",
                            "vessel_type": "Chemical Tanker",
                            "flag": "Singapore",
                            "imo": "9876546",
                            "owner": "Petro Marine Ltd",
                            "charterer": "PetroChem Industries",
                            "length": 175.0,
                            "beam": 31.0,
                            "draft": 11.8,
                            "gross_tonnage": 23000,
                        }
                    ],
                    "parties": [
                        {"role": "owner", "name": "Gulf Shipping Co", "email": "owner@gulfshipping.com"},
                        {"role": "charterer", "name": "PetroChem Industries", "email": "ops@petrochem.com"},
                        {"role": "broker", "name": "Gulf STS Services", "email": "broker@gulfsts.com"},
                    ]
                },
                {
                    "title": "STS Operation - North Sea",
                    "location": "North Sea",
                    "sts_eta": datetime.utcnow() + timedelta(days=7),
                    "description": "North Sea STS transfer operation",
                    "vessels": [
                        {
                            "name": "MT North Sea",
                            "vessel_type": "Product Tanker",
                            "flag": "Norway",
                            "imo": "9876547",
                            "owner": "Nordic Tankers",
                            "charterer": "European Oil Corp",
                            "length": 220.0,
                            "beam": 38.0,
                            "draft": 13.5,
                            "gross_tonnage": 45000,
                        },
                        {
                            "name": "MT Baltic Trader",
                            "vessel_type": "Product Tanker",
                            "flag": "Denmark",
                            "imo": "9876548",
                            "owner": "Baltic Shipping",
                            "charterer": "European Oil Corp",
                            "length": 215.0,
                            "beam": 37.0,
                            "draft": 13.2,
                            "gross_tonnage": 42000,
                        }
                    ],
                    "parties": [
                        {"role": "owner", "name": "Nordic Tankers", "email": "owner@nordictankers.com"},
                        {"role": "charterer", "name": "European Oil Corp", "email": "ops@europeanoil.com"},
                        {"role": "broker", "name": "North Sea STS", "email": "broker@northsea-sts.com"},
                    ]
                }
            ]

            for op_data in operations:
                print(f"Creating operation: {op_data['title']}")

                # Create room
                room = Room(
                    title=op_data["title"],
                    location=op_data["location"],
                    sts_eta=op_data["sts_eta"],
                    created_by="admin@sts.com",
                    description=op_data["description"]
                )
                session.add(room)
                await session.flush()  # Get room ID

                # Create vessels
                for vessel_data in op_data["vessels"]:
                    vessel = Vessel(
                        room_id=room.id,
                        name=vessel_data["name"],
                        vessel_type=vessel_data["vessel_type"],
                        flag=vessel_data["flag"],
                        imo=vessel_data["imo"],
                        owner=vessel_data["owner"],
                        charterer=vessel_data["charterer"],
                        length=vessel_data["length"],
                        beam=vessel_data["beam"],
                        draft=vessel_data["draft"],
                        gross_tonnage=vessel_data["gross_tonnage"],
                    )
                    session.add(vessel)

                # Create parties
                for party_data in op_data["parties"]:
                    party = Party(
                        room_id=room.id,
                        role=party_data["role"],
                        name=party_data["name"],
                        email=party_data["email"]
                    )
                    session.add(party)

            await session.commit()
            print(f"Successfully created {len(operations)} test STS operations!")

        except Exception as e:
            print(f"Error creating test rooms: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


if __name__ == "__main__":
    asyncio.run(create_test_rooms())
