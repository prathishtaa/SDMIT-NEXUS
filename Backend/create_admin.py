#!/usr/bin/env python3
"""
Admin User Creation Script
This script creates an initial admin user for SDMIT Nexus
"""

import sys
import os
from passlib.context import CryptContext

# Add the Backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import SessionLocal
from models import Admin

def create_admin_user():
    """Create an initial admin user"""
    print("Creating Admin User for SDMIT Nexus")
    print("=" * 40)
    
    # Get admin details
    admin_name = input("Enter admin name: ").strip()
    admin_email = input("Enter admin email: ").strip()
    admin_password = input("Enter admin password: ").strip()
    
    if not admin_name or not admin_email or not admin_password:
        print("❌ All fields are required!")
        return
    
    # Hash the password
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(admin_password)
    
    # Create database session
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(Admin.email == admin_email).first()
        if existing_admin:
            print(f"❌ Admin with email {admin_email} already exists!")
            return
        
        # Create new admin
        new_admin = Admin(
            name=admin_name,
            email=admin_email,
            password_hash=hashed_password
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        print("✅ Admin user created successfully!")
        print(f"   Name: {new_admin.name}")
        print(f"   Email: {new_admin.email}")
        print(f"   ID: {new_admin.admin_id}")
        print()
        print("You can now login to the admin panel using these credentials.")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()


