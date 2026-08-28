"""Authentication routes: register, login, and current-user profile."""
from flask import Blueprint, request, jsonify

from app.services.auth_service import register_user, login_user
from app.utils.auth import token_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    """Register a new citizen account."""
    data = request.get_json(silent=True) or {}
    response, status = register_user(data)
    return jsonify(response), status


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    """Log in with email and password; receive a JWT."""
    data = request.get_json(silent=True) or {}
    response, status = login_user(data)
    return jsonify(response), status


@auth_bp.route("/auth/me", methods=["GET"])
@token_required
def me():
    """Return the currently authenticated user's profile."""
    return jsonify({"user": request.current_user}), 200
