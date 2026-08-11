"""Health-check endpoint."""
from datetime import datetime, timezone

from flask import Blueprint, jsonify

from app.extensions import get_db

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
def health_check():
    """Returns API health status and MongoDB connectivity."""
    mongo_ok = False
    try:
        get_db().command("ping")
        mongo_ok = True
    except Exception:
        pass

    status = "ok" if mongo_ok else "degraded"
    http_code = 200 if mongo_ok else 503

    return jsonify({
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "ok",
            "mongodb": "ok" if mongo_ok else "unreachable",
        },
        "version": "1.0.0",
    }), http_code
