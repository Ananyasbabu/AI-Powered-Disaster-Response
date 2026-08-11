"""MongoDB collection helpers and index initialisation."""
from pymongo import ASCENDING, GEOSPHERE

from app.extensions import get_db


# ---------------------------------------------------------------------------
# Collection accessors
# ---------------------------------------------------------------------------

def get_collection(name: str):
    """Return a MongoDB collection by name."""
    return get_db()[name]


def users():
    return get_collection("users")


def incidents():
    return get_collection("incidents")


def risk_predictions():
    return get_collection("risk_predictions")


def shelters():
    return get_collection("shelters")


def alerts():
    return get_collection("alerts")


def evacuation_routes():
    return get_collection("evacuation_routes")


# ---------------------------------------------------------------------------
# Index initialisation (idempotent)
# ---------------------------------------------------------------------------

def init_collections():
    """
    Ensure all required collections have their indexes.
    Safe to call multiple times — create_index is idempotent.
    """
    db = get_db()

    # users — unique email
    db["users"].create_index([("email", ASCENDING)], unique=True)

    # incidents — sorted queries + geo lookups
    db["incidents"].create_index([("created_at", ASCENDING)])
    db["incidents"].create_index([("status", ASCENDING)])
    db["incidents"].create_index([("user_id", ASCENDING)])
    db["incidents"].create_index([("location", GEOSPHERE)])

    # risk_predictions
    db["risk_predictions"].create_index([("created_at", ASCENDING)])

    # shelters — geo lookups + active filter
    db["shelters"].create_index([("location", GEOSPHERE)])
    db["shelters"].create_index([("is_active", ASCENDING)])

    # alerts
    db["alerts"].create_index([("created_at", ASCENDING)])
    db["alerts"].create_index([("is_active", ASCENDING)])

    # evacuation_routes
    db["evacuation_routes"].create_index([("created_at", ASCENDING)])

    print("[DB] Collections and indexes initialised.")
