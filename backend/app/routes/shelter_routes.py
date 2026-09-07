import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from app.models import Shelter

shelter_bp = Blueprint("shelter_bp", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


@shelter_bp.route("/shelters/report", methods=["POST"])
def report_shelter():
    """Add a shelter and store its details in MongoDB."""
    try:
        name = request.form.get("name")
        lat = request.form.get("lat") or request.form.get("latitude")
        lng = (
            request.form.get("lng")
            or request.form.get("lon")
            or request.form.get("longitude")
        )
        location_name = (
            request.form.get("address")
            or request.form.get("location_name", "")
        )
        facilities = request.form.get(
            "facilities",
            "Water, Emergency Shelter, Power",
        )

        if not name or lat is None or lng is None:
            return jsonify({
                "message": "Shelter name, latitude, and longitude are required."
            }), 400

        try:
            latitude = float(lat)
            longitude = float(lng)
            total_beds = max(0, int(request.form.get("total_beds", 100)))
            available_beds = max(
                0,
                min(
                    total_beds,
                    int(request.form.get("available_beds", total_beds)),
                ),
            )
        except (TypeError, ValueError):
            return jsonify({
                "message": "Latitude, longitude, and bed counts must be valid numbers."
            }), 400

        image_url = None

        if "image" in request.files:
            file = request.files["image"]

            if file and file.filename and allowed_file(file.filename):
                filename = (
                    f"shelter_{uuid.uuid4().hex}_"
                    f"{secure_filename(file.filename)}"
                )

                upload_folder = current_app.config.get(
                    "UPLOAD_FOLDER",
                    os.path.join(current_app.root_path, "..", "uploads"),
                )
                os.makedirs(upload_folder, exist_ok=True)

                file.save(os.path.join(upload_folder, filename))
                image_url = f"uploads/{filename}"

        new_shelter = Shelter(
            name=name.strip(),
            location_name=location_name.strip(),
            latitude=latitude,
            longitude=longitude,
            location={
                "type": "Point",
                "coordinates": [longitude, latitude],
            },
            total_beds=total_beds,
            available_beds=available_beds,
            occupied_beds=max(0, total_beds - available_beds),
            total_capacity=total_beds,
            facilities=facilities.strip(),
            image_url=image_url,
            created_by_role="user",
        )

        new_shelter.save()

        return jsonify({
            "status": "success",
            "message": "Shelter registered successfully.",
            "data": new_shelter.to_dict(),
        }), 201

    except Exception as error:
        print(f"Error in /shelters/report: {error}")
        return jsonify({
            "message": f"Failed to process shelter report: {str(error)}"
        }), 500


@shelter_bp.route("/shelters", methods=["GET"])
def get_shelters():
    try:
        shelters = Shelter.objects()
        return jsonify([
            shelter.to_dict() for shelter in shelters
        ]), 200
    except Exception as error:
        return jsonify({"message": str(error)}), 500


@shelter_bp.route("/shelters/<shelter_id>", methods=["GET"])
def get_shelter_by_id(shelter_id):
    try:
        shelter = Shelter.objects.get(id=shelter_id)
        return jsonify(shelter.to_dict()), 200
    except Shelter.DoesNotExist:
        return jsonify({"message": "Shelter not found."}), 404
    except Exception as error:
        return jsonify({"message": str(error)}), 500


@shelter_bp.route("/shelters/<shelter_id>/beds", methods=["PATCH"])
def update_shelter_beds(shelter_id):
    """Add or remove one available bed and save it in MongoDB."""
    try:
        clean_id = shelter_id.replace("admin_", "", 1)
        data = request.get_json() or {}
        action = data.get("action")

        if action not in ["add", "remove"]:
            return jsonify({
                "message": "Action must be add or remove."
            }), 400

        shelter = Shelter.objects.get(id=clean_id)

        total_beds = int(
            shelter.total_beds or shelter.total_capacity or 0
        )
        available_beds = int(
            shelter.available_beds
            if shelter.available_beds is not None
            else total_beds - int(shelter.occupied_beds or 0)
        )

        if action == "add":
            available_beds = min(total_beds, available_beds + 1)
        else:
            available_beds = max(0, available_beds - 1)

        shelter.available_beds = available_beds
        shelter.occupied_beds = max(0, total_beds - available_beds)
        shelter.save()

        return jsonify({
            "status": "success",
            "message": "Available bed count updated.",
            "data": shelter.to_dict(),
        }), 200

    except Shelter.DoesNotExist:
        return jsonify({"message": "Shelter not found."}), 404
    except Exception as error:
        return jsonify({"message": str(error)}), 500


@shelter_bp.route("/shelters/<shelter_id>/risk", methods=["PATCH", "PUT"])
def update_shelter_risk(shelter_id):
    try:
        data = request.get_json() or {}
        shelter = Shelter.objects.get(id=shelter_id)

        if "risk_level" in data:
            shelter.risk_level = data["risk_level"]

        if "status" in data:
            shelter.status = data["status"]

        if "available_beds" in data:
            total_beds = int(
                shelter.total_beds or shelter.total_capacity or 0
            )
            shelter.available_beds = max(
                0,
                min(total_beds, int(data["available_beds"])),
            )
            shelter.occupied_beds = max(
                0,
                total_beds - shelter.available_beds,
            )

        shelter.save()

        return jsonify({
            "status": "success",
            "data": shelter.to_dict(),
        }), 200

    except Shelter.DoesNotExist:
        return jsonify({"message": "Shelter not found."}), 404
    except Exception as error:
        return jsonify({"message": str(error)}), 500


@shelter_bp.route("/shelters/<shelter_id>", methods=["DELETE"])
def delete_shelter(shelter_id):
    try:
        shelter = Shelter.objects.get(id=shelter_id)
        shelter.delete()

        return jsonify({
            "status": "success",
            "message": "Shelter deleted successfully.",
        }), 200

    except Shelter.DoesNotExist:
        return jsonify({"message": "Shelter not found."}), 404
    except Exception as error:
        return jsonify({"message": str(error)}), 500