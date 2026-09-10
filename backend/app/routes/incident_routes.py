import os
import uuid
import math
from datetime import datetime

import requests
from bson.objectid import ObjectId
from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from app.services.cv_service import verify_incident_image, verify_resolution_image
from app.services.weather_service import verify_with_weather


UPLOAD_FOLDER = os.path.join(
    os.path.dirname(__file__), "..", "..", "uploads"
)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
INCIDENT_MATCH_RADIUS_METERS = 100

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def calculate_distance_meters(lat1, lon1, lat2, lon2):
    earth_radius = 6371000

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius * c


def get_community_confidence(upcount):
    if upcount >= 4:
        return "High"

    if upcount >= 2:
        return "Medium"

    return "Low"


def get_readable_location(latitude, longitude):
    """Convert GPS coordinates into a location name."""
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": latitude,
                "lon": longitude,
                "format": "jsonv2",
            },
            headers={
                "User-Agent": "DisasterGuard/1.0",
            },
            timeout=5,
        )

        if response.status_code == 200:
            data = response.json()
            return data.get("display_name", "Location unavailable")

    except Exception as error:
        print(f"Location lookup error: {error}")

    return "Location unavailable"


def init_incident_routes(db):
    incident_bp = Blueprint("incident_bp", __name__)

    @incident_bp.route("/incidents/report", methods=["POST"])
    def report_incident():
        if "image" not in request.files:
            return jsonify({
                "status": "error",
                "message": "Please upload an incident image.",
            }), 400

        file = request.files["image"]

        if file.filename == "":
            return jsonify({
                "status": "error",
                "message": "Please select an image file.",
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                "status": "error",
                "message": "Only JPG, JPEG, PNG, and WEBP images are allowed.",
            }), 400

        incident_type = request.form.get("type", "Flood")

        allowed_incident_types = [
            "Flood",
            "Blocked Road",
            "Structural Damage",
            "Landslide",
            "Fire",
            "Fallen Tree",
            "Other",
        ]

        if incident_type not in allowed_incident_types:
            return jsonify({
                "status": "error",
                "message": "Invalid incident type.",
            }), 400

        description = request.form.get("description", "").strip()
        severity = request.form.get("severity", "Medium")
        reporter_id = request.form.get("reporter_id", "anonymous")

        if len(description) > 500:
            return jsonify({
                "status": "error",
                "message": "Description must be 500 characters or fewer.",
            }), 400

        if severity not in ["Low", "Medium", "High"]:
            return jsonify({
                "status": "error",
                "message": "Invalid severity level.",
            }), 400

        latitude = request.form.get("latitude")
        longitude = request.form.get("longitude")

        if not latitude or not longitude:
            return jsonify({
                "status": "error",
                "message": "Current location is required.",
            }), 400

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except ValueError:
            return jsonify({
                "status": "error",
                "message": "Invalid location coordinates.",
            }), 400

        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            return jsonify({
                "status": "error",
                "message": "Location coordinates are outside the valid range.",
            }), 400

        original_filename = secure_filename(file.filename)
        filename = f"{uuid.uuid4().hex}_{original_filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        file.save(filepath)

        cv_result = verify_incident_image(filepath)

        if cv_result.get("status") in ["invalid_image", "error"]:
            if os.path.exists(filepath):
                os.remove(filepath)

            return jsonify({
                "status": "error",
                "message": cv_result.get(
                    "message",
                    "The uploaded file is not a valid image.",
                ),
            }), 400

        weather_result = verify_with_weather(
            latitude,
            longitude,
            incident_type,
        )

        location_name = get_readable_location(latitude, longitude)

        incident_status = "PENDING"
        cv_result["status"] = "pending_review"

        existing_incidents = db.incidents.find({
            "type": incident_type,
            "status": {
                "$in": ["PENDING", "VERIFIED"],
            },
        })

        for existing_incident in existing_incidents:
            existing_coordinates = (
                existing_incident.get("location", {})
                .get("coordinates", [])
            )

            if len(existing_coordinates) != 2:
                continue

            existing_longitude = existing_coordinates[0]
            existing_latitude = existing_coordinates[1]

            distance = calculate_distance_meters(
                latitude,
                longitude,
                existing_latitude,
                existing_longitude,
            )

            if distance <= INCIDENT_MATCH_RADIUS_METERS:
                new_upcount = existing_incident.get("upcount", 1) + 1
                community_confidence = get_community_confidence(new_upcount)

                db.incidents.update_one(
                    {"_id": existing_incident["_id"]},
                    {
                        "$set": {
                            "upcount": new_upcount,
                            "community_confidence": community_confidence,
                            "location_name": existing_incident.get(
                                "location_name",
                                location_name,
                            ),
                            "updated_at": datetime.utcnow(),
                        }
                    },
                )

                if os.path.exists(filepath):
                    os.remove(filepath)

                return jsonify({
                    "status": "success",
                    "message": (
                        "This incident was already reported nearby. "
                        "Your report was counted as a confirmation."
                    ),
                    "incident_id": str(existing_incident["_id"]),
                    "duplicate": True,
                    "upcount": new_upcount,
                    "community_confidence": community_confidence,
                    "matching_distance_meters": round(distance, 2),
                    "verification": {
                        "cv": cv_result,
                        "weather": weather_result,
                        "overall_status": existing_incident.get(
                            "status",
                            "PENDING",
                        ),
                    },
                }), 200

        incident_doc = {
            "reporter_id": reporter_id,
            "type": incident_type,
            "severity": severity,
            "description": description,
            "image_url": f"uploads/{filename}",
            "original_filename": original_filename,
            "location_name": location_name,
            "location": {
                "type": "Point",
                "coordinates": [longitude, latitude],
            },
            "image_details": {
                "format": cv_result.get("image_format"),
                "width": cv_result.get("image_width"),
                "height": cv_result.get("image_height"),
            },
            "cv_verification": {
                "status": cv_result.get("status", "pending_review"),
                "confidence_score": cv_result.get(
                    "confidence_score",
                    0.0,
                ),
                "detected_labels": cv_result.get(
                    "detected_labels",
                    [],
                ),
                "detections": cv_result.get("detections", []),
                "model": cv_result.get(
                    "model",
                    "Computer Vision Classifier",
                ),
                "message": cv_result.get("message", ""),
            },
            "weather_verification": weather_result,
            "overall_confidence": "Pending admin review",
            "status": incident_status,
            "upcount": 1,
            "community_confidence": "Low",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        inserted_id = db.incidents.insert_one(incident_doc).inserted_id

        return jsonify({
            "status": "success",
            "message": (
                "Incident submitted successfully. "
                "Computer Vision result is saved for admin review."
            ),
            "incident_id": str(inserted_id),
            "location_name": location_name,
            "verification": {
                "cv": cv_result,
                "weather": weather_result,
                "overall_status": incident_status,
            },
        }), 201

    @incident_bp.route("/incidents/verified", methods=["GET"])
    def get_verified_incidents():
        incidents = list(db.incidents.find({
            "status": "VERIFIED",
        }))

        for incident in incidents:
            incident["_id"] = str(incident["_id"])

        return jsonify({
            "status": "success",
            "data": incidents,
        }), 200

   @incident_bp.route("/incidents/resolve/<incident_id>", methods=["POST"])
def resolve_incident(incident_id):
    try:
        query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}
        
        incident = db.incidents.find_one(query_filter)
        if not incident:
            return jsonify({"status": "error", "message": "Incident not found."}), 404

        # Read uploaded image file
        uploaded_file = None
        if "image" in request.files:
            uploaded_file = request.files["image"]
        elif "proof" in request.files:
            uploaded_file = request.files["proof"]
        elif len(request.files) > 0:
            uploaded_file = list(request.files.values())[0]

        if not uploaded_file or uploaded_file.filename == "":
            return jsonify({
                "status": "error",
                "message": "Please upload a proof image to resolve this incident."
            }), 400

        # Save temporarily
        filename = f"proof_{uuid.uuid4().hex}_{secure_filename(uploaded_file.filename)}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        uploaded_file.save(filepath)

        # Execute CV verification
        cv_result = verify_resolution_image(filepath)

        # Cleanup proof file
        if os.path.exists(filepath):
            os.remove(filepath)

        # STRICT CHECK FOR DELETION
        if cv_result.get("is_cleared") is True:
            # ONLY DELETE IF IS_CLEARED IS EXPLICITLY TRUE
            db.incidents.delete_one(query_filter)
            return jsonify({
                "status": "success",
                "message": "Resolution verified! Incident removed from database.",
                "resolution_cv": cv_result
            }), 200
        else:
            # DO NOT DELETE FROM MONGO IF HAZARD IS PRESENT
            return jsonify({
                "status": "error",
                "message": "Resolution rejected! Hazard is still present in proof image.",
                "resolution_cv": cv_result
            }), 400

    except Exception as error:
        return jsonify({"status": "error", "message": str(error)}), 500
    def resolve_incident(incident_id):
        try:
            query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}
            
            incident = db.incidents.find_one(query_filter)
            if not incident:
                return jsonify({"status": "error", "message": "Incident not found."}), 404

            # 1. Catch uploaded file from FormData (checks 'image' or 'proof' or any file)
            uploaded_file = None
            if "image" in request.files:
                uploaded_file = request.files["image"]
            elif "proof" in request.files:
                uploaded_file = request.files["proof"]
            elif len(request.files) > 0:
                uploaded_file = list(request.files.values())[0]

            if not uploaded_file or uploaded_file.filename == "":
                return jsonify({
                    "status": "error",
                    "message": "Please upload a proof image to resolve this incident."
                }), 400

            # 2. Save file temporarily for CV analysis
            filename = f"proof_{uuid.uuid4().hex}_{secure_filename(uploaded_file.filename)}"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            uploaded_file.save(filepath)

            # 3. Analyze proof with CV model
            cv_result = verify_resolution_image(filepath)

            # Clean up uploaded proof file after verification
            if os.path.exists(filepath):
                os.remove(filepath)

            # 4. Check if area is clear
            if cv_result.get("is_cleared") is True:
                # NO HAZARD DETECTED -> Delete from Database
                db.incidents.delete_one(query_filter)
                return jsonify({
                    "status": "success",
                    "message": "Verification passed! Clear road confirmed. Incident removed from database.",
                    "resolution_cv": cv_result
                }), 200
            else:
                # HAZARD STILL DETECTED -> DO NOT DELETE (No changes to database)
                return jsonify({
                    "status": "error",
                    "message": "Verification failed! AI detected that a disaster hazard is still present in the image.",
                    "resolution_cv": cv_result
                }), 400

        except Exception as error:
            return jsonify({"status": "error", "message": str(error)}), 500
        try:
            query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}
            
            # Check if incident exists
            incident = db.incidents.find_one(query_filter)
            if not incident:
                return jsonify({"status": "error", "message": "Incident not found."}), 404

            filepath = None

            # Case A: File uploaded via FormData
            if "image" in request.files:
                file = request.files["image"]
                if file and file.filename != "":
                    filename = f"res_{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)

            # Case B: Filepath passed as JSON body
            elif request.is_json:
                data = request.get_json() or {}
                filepath = data.get("filepath")

            print(f"--- RESOLVE DEBUG ---")
            print(f"Incident ID: {incident_id}")
            print(f"Filepath received: {filepath}")

            if not filepath or not os.path.exists(filepath):
                # If no image path provided or file missing, allow manual resolution / bypass
                print("No valid file provided. Deleting incident directly...")
                db.incidents.delete_one(query_filter)
                return jsonify({"status": "success", "message": "Incident resolved and removed."}), 200

            # Run CV verification
            cv_result = verify_resolution_image(filepath)
            print(f"CV Result: {cv_result}")

            # Check if CV confirms area is clear or if CV returned success/clear flag
            is_cleared = cv_result.get("is_cleared", cv_result.get("status") == "success")

            if is_cleared:
                db.incidents.delete_one(query_filter)
                if os.path.exists(filepath):
                    os.remove(filepath)
                return jsonify({
                    "status": "success",
                    "message": "Clear photo verified! Incident removed from map.",
                    "resolution_cv": cv_result
                }), 200
            else:
                return jsonify({
                    "status": "error",
                    "message": cv_result.get("message", "Proof verification failed: AI still detects hazard."),
                    "resolution_cv": cv_result
                }), 400

        except Exception as err:
            print(f"Resolve Error: {err}")
            return jsonify({"status": "error", "message": str(err)}), 500
        data = request.get_json() or {}
        proof_image_path = data.get("filepath")
        
        cv_result = None
        if proof_image_path:
            cv_result = verify_resolution_image(proof_image_path)
            
        # Check if the CV verification confirms the area is clear
        is_cleared = cv_result.get("is_cleared", False) if cv_result else True

        query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}

        if is_cleared:
            # Delete from MongoDB if clear photo is confirmed
            db.incidents.delete_one(query_filter)
            return jsonify({
                "status": "success",
                "message": "Area verified as clear. Incident successfully resolved and removed.",
                "resolution_cv": cv_result
            }), 200
        else:
            # Keep as active if hazard is still detected
            return jsonify({
                "status": "error",
                "message": "Proof verification failed: AI detected that an active hazard is still present.",
                "resolution_cv": cv_result
            }), 400
        data = request.get_json() or {}
        proof_image_path = data.get("filepath")
        
        cv_result = None
        if proof_image_path:
            cv_result = verify_resolution_image(proof_image_path)
        
        # Update status in MongoDB using the passed `db` instance
        query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}
        db.incidents.update_one(
            query_filter,
            {"$set": {
                "status": "RESOLVED",
                "resolution_cv_verification": cv_result,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return jsonify({
            "message": "Incident marked as resolved",
            "resolution_cv": cv_result
        }), 200

    @incident_bp.route("/admin/incidents/<incident_id>/action", methods=["POST"])
    def admin_incident_action(incident_id):
        try:
            data = request.get_json() or {}
            action = str(data.get("action", "")).lower() # "approve" or "reject"
            
            query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}

            if action in ["approve", "delete"]:
                # Admin approves resolution -> Delete incident from MongoDB
                db.incidents.delete_one(query_filter)
                return jsonify({"status": "success", "message": "Incident resolution approved and deleted from database."}), 200

            elif action == "reject":
                # Admin rejects resolution -> Revert status back to active (VERIFIED)
                db.incidents.update_one(query_filter, {
                    "$set": {
                        "status": "VERIFIED",
                        "resolution_proof_url": None,
                        "updated_at": datetime.utcnow()
                    }
                })
                return jsonify({"status": "success", "message": "Resolution rejected. Incident remains active in database."}), 200

            return jsonify({"status": "error", "message": "Invalid action."}), 400
        except Exception as error:
            return jsonify({"status": "error", "message": str(error)}), 500

    @incident_bp.route("/predict-shelters-risk", methods=["POST"])
    def predict_shelter_risk():
        try:
            shelters = list(db.shelters.find({}))

            for shelter in shelters:
                shelter["_id"] = str(shelter["_id"])

                if (
                    "latitude" not in shelter
                    or shelter["latitude"] is None
                ):
                    coordinates = (
                        shelter.get("location", {})
                        .get("coordinates", [0.0, 0.0])
                    )

                    shelter["latitude"] = (
                        float(coordinates[1])
                        if len(coordinates) >= 2
                        else 0.0
                    )

                    shelter["longitude"] = (
                        float(coordinates[0])
                        if len(coordinates) >= 2
                        else 0.0
                    )

                if "risk_level" not in shelter:
                    shelter["risk_level"] = "Low"

            return jsonify({
                "status": "success",
                "shelters": shelters,
            }), 200

        except Exception as error:
            return jsonify({
                "status": "error",
                "message": str(error),
            }), 500

    return incident_bp