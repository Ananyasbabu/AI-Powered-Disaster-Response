"""
Admin seed script.

Usage (from the backend/ directory):
    python seeds/seed_admin.py
"""
import os
import sys
from datetime import datetime, timezone

# Allow imports from the backend/ root when run as a standalone script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Explicitly load .env from the backend root folder
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

try:
    from flask_bcrypt import Bcrypt
except ImportError:
    print("ERROR: flask-bcrypt is not installed. Run: pip install flask-bcrypt")
    sys.exit(1)


def seed_admin():
    admin_name = os.getenv("ADMIN_NAME", "Admin").strip()
    admin_email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    admin_password = (os.getenv("ADMIN_PASSWORD") or "").strip()
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME", "disaster_db")

    if not mongo_uri:
        print("ERROR: MONGO_URI is missing from your .env file!")
        sys.exit(1)

    if not admin_email or not admin_password:
        print(
            "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment "
            "variables or a .env file."
        )
        sys.exit(1)

    client = MongoClient(mongo_uri)
    db = client[db_name]
    users_col = db["users"]

    # Ensure unique index exists
    users_col.create_index([("email", 1)], unique=True)

    bcrypt = Bcrypt()
    hashed = bcrypt.generate_password_hash(admin_password).decode("utf-8")

    doc = {
        "name": admin_name,
        "email": admin_email,
        "password": hashed,
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "profile": {
            "phone": None,
            "address": None,
            "latitude": None,
            "longitude": None,
        },
    }

    try:
        result = users_col.insert_one(doc)
        print("✅ Admin account created successfully.")
        print(f"   Name  : {doc['name']}")
        print(f"   Email : {doc['email']}")
        print(f"   ID    : {result.inserted_id}")
    except DuplicateKeyError:
        print(f"ℹ️ Admin account already exists for: {admin_email}")
    finally:
        client.close()


if __name__ == "__main__":
    seed_admin()