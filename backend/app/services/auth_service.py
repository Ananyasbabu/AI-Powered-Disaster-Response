"""Business logic for authentication — registration and login."""
import re
from typing import Tuple, Optional

from pymongo.errors import DuplicateKeyError

from app.extensions import bcrypt
from app.utils.db import users
from app.utils.auth import generate_token
from app.models.user import build_user_document, serialize_user

EMAIL_RE = re.compile(r"^[\w.+-]+@[\w-]+\.[\w.]+$")


def _validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email))


def _validate_password(password: str) -> Optional[str]:
    """Return an error string if password fails requirements, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one digit."
    return None


def register_user(data: dict) -> Tuple[dict, int]:
    """
    Register a new citizen user.
    Returns (response_dict, http_status_code).
    """
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # --- Input validation ---
    if not name:
        return {"error": "Name is required."}, 400
    if not email or not _validate_email(email):
        return {"error": "A valid email address is required."}, 400
    pwd_error = _validate_password(password)
    if pwd_error:
        return {"error": pwd_error}, 400

    # Citizens cannot self-register as admin
    role = "citizen"

    # Hash password
    hashed = bcrypt.generate_password_hash(password).decode("utf-8")

    doc = build_user_document(name, email, hashed, role)

    try:
        result = users().insert_one(doc)
    except DuplicateKeyError:
        return {"error": "An account with that email already exists."}, 409

    doc["_id"] = result.inserted_id
    token = generate_token(str(result.inserted_id), role)

    return {
        "message": "Registration successful.",
        "token": token,
        "user": serialize_user(doc),
    }, 201


def login_user(data: dict) -> Tuple[dict, int]:
    """
    Authenticate an existing user.
    Returns (response_dict, http_status_code).
    """
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return {"error": "Email and password are required."}, 400

    user = users().find_one({"email": email})
    if user is None:
        # Don't reveal whether the email exists
        return {"error": "Invalid email or password."}, 401

    if not user.get("is_active", True):
        return {"error": "Account is disabled. Contact an administrator."}, 403

    if not bcrypt.check_password_hash(user["password"], password):
        return {"error": "Invalid email or password."}, 401

    token = generate_token(str(user["_id"]), user["role"])

    return {
        "message": "Login successful.",
        "token": token,
        "user": serialize_user(user),
    }, 200
