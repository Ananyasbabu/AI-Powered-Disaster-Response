"""JWT authentication utilities and route decorators."""
from functools import wraps
from datetime import datetime, timezone, timedelta

import jwt
from bson import ObjectId
from flask import request, jsonify, current_app

from app.utils.db import users


def generate_token(user_id: str, role: str) -> str:
    """Generate a signed JWT for the given user."""
    secret = current_app.config["JWT_SECRET_KEY"]
    expiry_hours = current_app.config["JWT_EXPIRY_HOURS"]

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    secret = current_app.config["JWT_SECRET_KEY"]
    return jwt.decode(token, secret, algorithms=["HS256"])


def token_required(f):
    """Decorator: require a valid Bearer JWT in the Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return (
                jsonify({"error": "Authorization token is missing or malformed."}),
                401,
            )

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please log in again."}), 401
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid token."}), 401

        user = users().find_one({"_id": ObjectId(payload["sub"])})
        if user is None:
            return jsonify({"error": "User not found."}), 401

        # Attach user info to the request context for downstream handlers
        request.current_user = {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        }
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator: require a valid JWT AND admin role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Inline token check so admin_required can be used without stacking
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return (
                jsonify({"error": "Authorization token is missing or malformed."}),
                401,
            )

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please log in again."}), 401
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid token."}), 401

        user = users().find_one({"_id": ObjectId(payload["sub"])})
        if user is None:
            return jsonify({"error": "User not found."}), 401

        if user["role"] != "admin":
            return jsonify({"error": "Admin privileges required."}), 403

        request.current_user = {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        }
        return f(*args, **kwargs)

    return decorated
