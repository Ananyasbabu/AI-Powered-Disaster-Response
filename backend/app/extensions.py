"""Flask extension instances (initialised in the app factory)."""
import threading
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
import os

bcrypt = Bcrypt()

# Module-level client + db, initialised once per process
_client = None
_db = None
_lock = threading.Lock()

class MongoDB:
    def __init__(self):
        self.db = None

mongo = MongoDB()


def init_mongo(app):
    """Initialise the PyMongo client from app config."""
    global _client, _db
    with _lock:
        if _client is None:
            _client = MongoClient(app.config["MONGO_URI"])
            _db = _client[app.config["MONGO_DB_NAME"]]
            mongo.db = _db  # Attach database instance to the global mongo object
            
            # Test connection
            try:
                _client.admin.command('ping')
                print(" Connected successfully to MongoDB Atlas Cloud!")
            except Exception as e:
                print(" Failed to connect to MongoDB Atlas:", e)


def get_db():
    """Return the database instance. Must call init_mongo(app) first."""
    if _db is None:
        raise RuntimeError(
            "MongoDB not initialised. Call init_mongo(app) first."
        )
    return _db