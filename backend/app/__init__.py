"""Flask application factory."""
import os
from flask import Flask
from flask_cors import CORS

from config.settings import get_config
from app.extensions import bcrypt, init_mongo, mongo
from app.utils.db import init_collections

# Route imports
from app.routes.health import health_bp
from app.routes.auth import auth_bp
from app.routes.incident_routes import incident_bp, init_incident_routes
from app.routes.admin_routes import admin_bp, init_admin_routes


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)

    cfg = get_config()
    app.config.from_object(cfg)

    # Ensure upload directory exists
    os.makedirs(cfg.UPLOAD_FOLDER, exist_ok=True)

    # Initialise extensions
    CORS(
        app,
        resources={r"/api/*": {"origins": cfg.CORS_ORIGINS}},
        supports_credentials=True,
    )
    bcrypt.init_app(app)
    init_mongo(app)

    # Initialise collections and indexes (requires mongo to be ready)
    with app.app_context():
        init_collections()

    # Register blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
   

    # Register Member 2 & Admin Blueprints using PyMongo instance
    # mongo.db passes the connected MongoDB database directly
    app.register_blueprint(init_incident_routes(mongo.db))
    app.register_blueprint(init_admin_routes(mongo.db))

    return app