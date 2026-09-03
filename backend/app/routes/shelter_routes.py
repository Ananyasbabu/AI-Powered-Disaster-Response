import os
from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename
from app.models.shelter import Shelter

shelter_bp = Blueprint("shelter_bp", __name__)


@shelter_bp.route("/shelters", methods=["POST"])
def add_shelter():
    try:
        # Support both multipart/form-data and application/json payloads
        if request.is_json:
            data = request.get_json() or {}
            name = data.get("name")
            location_name = data.get("location_name")
            lat_val = data.get("latitude") if data.get("latitude") is not None else data.get("lat")
            lng_val = data.get("longitude") if data.get("longitude") is not None else data.get("lng")
            total_beds_val = data.get("total_beds", 0)
            available_beds_val = data.get("available_beds", 0)
            facilities = data.get("facilities", "Water, Emergency Shelter, Power")
            role = data.get("role") or data.get("created_by_role", "user")
            image_url = data.get("image_url")
        else:
            name = request.form.get("name")
            location_name = request.form.get("location_name")
            lat_val = request.form.get("latitude") or request.form.get("lat")
            lng_val = request.form.get("longitude") or request.form.get("lng")
            total_beds_val = request.form.get("total_beds", 0)
            available_beds_val = request.form.get("available_beds", 0)
            facilities = request.form.get("facilities", "Water, Emergency Shelter, Power")
            role = request.form.get("role") or request.form.get("created_by_role", "user")

            image_file = request.files.get("image")
            image_url = None

            if image_file and image_file.filename != "":
                filename = secure_filename(image_file.filename)
                upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
                os.makedirs(upload_folder, exist_ok=True)
                upload_path = os.path.join(upload_folder, filename)
                image_file.save(upload_path)
                image_url = f"/uploads/{filename}"

        # Validate mandatory field presence
        if not name or lat_val is None or lng_val is None:
            return jsonify({
                "success": False,
                "message": "Missing required fields: name, latitude/lat, or longitude/lng."
            }), 400

        latitude = float(lat_val)
        longitude = float(lng_val)
        total_beds = int(total_beds_val)
        available_beds = int(available_beds_val) if available_beds_val else total_beds

        # Initialize MongoEngine Document instance
        new_shelter = Shelter(
            name=name,
            location_name=location_name,
            latitude=latitude,
            longitude=longitude,
            total_beds=total_beds,
            available_beds=available_beds,
            facilities=facilities,
            image_url=image_url,
            created_by_role=role,
        )
        new_shelter.save()

        shelter_dict = new_shelter.to_dict()

        return jsonify({
            "success": True,
            "message": "Shelter added successfully",
            "data": shelter_dict,
            "shelter": shelter_dict
        }), 201

    except (ValueError, TypeError) as err:
        return jsonify({
            "success": False,
            "message": "Invalid numeric input type for coordinates or bed counts.",
            "error": str(err)
        }), 400
    except Exception as err:
        return jsonify({
            "success": False,
            "message": "Internal server error occurred while processing shelter request.",
            "error": str(err)
        }), 500


@shelter_bp.route("/shelters", methods=["GET"])
def get_shelters():
    try:
        # Fetch documents sorted by created_at using MongoEngine syntax
        shelters = Shelter.objects.order_by("-created_at")
        formatted_shelters = [s.to_dict() for s in shelters]

        return jsonify({
            "success": True,
            "data": formatted_shelters
        }), 200
    except Exception as err:
        return jsonify({
            "success": False,
            "message": "Failed to fetch shelters",
            "error": str(err)
        }), 500