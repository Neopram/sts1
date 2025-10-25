#!/usr/bin/env python3
"""Test login manually"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import AsyncSessionLocal
from app.schemas import LoginRequest
from app.routers.auth import login
from app.dependencies import create_access_token
from sqlalchemy import select
from app.models import User
from passlib.hash import bcrypt

async def test():
    # Create login request
    login_data = LoginRequest(email="test@sts.com", password="test123")
    
    async with AsyncSessionLocal() as session:
        try:
            result = await login(login_data, session)
            print(f"✅ Login successful!")
            print(f"Token: {result.token[:20]}...")
            print(f"Email: {result.email}")
            print(f"Role: {result.role}")
            print(f"Name: {result.name}")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())