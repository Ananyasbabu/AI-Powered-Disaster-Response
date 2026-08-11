"""User document schema helpers."""
from datetime import datetime, timezone

VALID_ROLES = ("citizen", "admin")


def build_user_document(
    name: str,
    email: str,
    hashed_password: str,
    role: str = "citizen",
) -> dict:
    """Return a well-formed user document ready for MongoDB insertion."""
    return {
        "name": name.strip(),
        "email": email.strip().lower(),
        "password": hashed_password,
        "role": role,
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


def serialize_user(user: dict) -> dict:
    """Convert a MongoDB user document to a JSON-safe dict (excludes password)."""
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user["is_active"],
        "created_at": user["created_at"].isoformat(),
    }
