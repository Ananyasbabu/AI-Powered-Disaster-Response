"""Flask extension instances (initialised in the app factory)."""
import threading

from flask_bcrypt import Bcrypt
from pymongo import MongoClient

bcrypt = Bcrypt()

# Module-level client + db, initialised once per process
_client = None
_db = None
_lock = threading.Lock()


def init_mongo(app):
    """Initialise the PyMongo client from app config."""
    global _client, _db
    with _lock:
        if _client is None:
            _client = MongoClient(app.config["MONGO_URI"])
            _db = _client[app.config["MONGO_DB_NAME"]]


def get_db():
    """Return the database instance. Must call init_mongo(app) first."""
    if _db is None:
        raise RuntimeError(
            "MongoDB not initialised. Call init_mongo(app) first."
        )
    return _db
