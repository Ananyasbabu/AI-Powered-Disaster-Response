from datetime import datetime
from bson.objectid import ObjectId
from flask import Blueprint, jsonify, request

from app.models.shelter import Shelter

admin_bp = Blueprint("admin", __name__)

# Hazardous computer vision classes
HAZARD_CLASSES = {"flood", "waterlogging", "fallen_tree", "landslide", "debris"}
CONFIDENCE_THRESHOLD = 0.40


def init_admin_routes(mongo_db):

    # 1. Admin Login
    @admin_bp.route("/admin/login", methods=["POST"])
    def admin_login():
        data = request.get_json() or {}
        username = data.get("username")
        password = data.get("password")

        # Basic auth check
        if username == "admin" and password == "admin123":
            return (
                jsonify(
                    {
                        "status": "success",
                        "token": "admin-session-token-123",
                        "role": "admin",
                    }
                ),
                200,
            )

        return (
            jsonify(
                {"status": "error", "message": "Invalid admin credentials"}
            ),
            401,
        )

    # 2. Live Dashboard Stats
    @admin_bp.route("/admin/stats", methods=["GET"])
    def get_dashboard_stats():
        total_incidents = mongo_db.incidents.count_documents({})
        pending_incidents = mongo_db.incidents.count_documents(
            {"status": "PENDING"}
        )
        verified_incidents = mongo_db.incidents.count_documents(
            {"status": "VERIFIED"}
        )

        # Count shelters using MongoEngine
        total_shelters = Shelter.objects.count()

        return (
            jsonify(
                {
                    "total_incidents": total_incidents,
                    "pending_incidents": pending_incidents,
                    "verified_incidents": verified_incidents,
                    "total_shelters": total_shelters,
                }
            ),
            200,
        )

    # 3. Incident Management (PyMongo)
    @admin_bp.route("/admin/incidents", methods=["GET"])
    def get_all_incidents():
        status_filter = request.args.get("status")
        query = {}

        if status_filter:
            query["status"] = status_filter

        incidents = list(mongo_db.incidents.find(query))

        for item in incidents:
            item["_id"] = str(item["_id"])

        return jsonify(incidents), 200

    @admin_bp.route(
        "/admin/incidents/<incident_id>/verify", methods=["PATCH"]
    )
    def verify_incident(incident_id):
        data = request.get_json() or {}
        new_status = data.get("status")

        if new_status not in ["VERIFIED", "REJECTED", "PENDING", "PENDING_ADMIN_APPROVAL"]:
            return jsonify({"message": "Invalid status"}), 400

        query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}

        result = mongo_db.incidents.update_one(
            query_filter,
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        if result.matched_count == 0:
            return jsonify({"message": "Incident not found"}), 404

        return jsonify({"message": f"Incident updated to {new_status}"}), 200

    # 3b. Incident Resolution with Computer Vision Verification
    @admin_bp.route("/admin/incidents/<incident_id>/resolve", methods=["POST"])
    def resolve_incident_cv(incident_id):
        if "image" not in request.files:
            return jsonify({"message": "No proof image uploaded"}), 400

        file = request.files["image"]

        # Run your computer vision inference routine
        # Replace run_cv_model with your actual ML model function call
        cv_results = run_cv_model(file)

        detected_labels = cv_results.get("detected_labels", [])
        confidence_score = cv_results.get("confidence_score", 0.0)

        # Check if active hazard is detected in the uploaded resolution image
        hazard_detected = any(
            label.lower() in HAZARD_CLASSES and confidence_score >= CONFIDENCE_THRESHOLD
            for label in detected_labels
        )

        if hazard_detected:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "CV Verification Failed: Uploaded image still shows hazards (e.g., flood/debris). Incident remains active.",
                        "cv_result": cv_results,
                    }
                ),
                400,
            )

        # If image is clear of hazards, remove the incident from MongoDB
        query_filter = (
            {"_id": ObjectId(incident_id)}
            if ObjectId.is_valid(incident_id)
            else {"_id": incident_id}
        )
        result = mongo_db.incidents.delete_one(query_filter)

        if result.deleted_count == 0:
            return jsonify({"message": "Incident not found"}), 404

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Resolution verified by CV! Incident resolved and deleted from database.",
                }
            ),
            200,
        )

    # 4. Shelter Management (MongoEngine)
    @admin_bp.route("/admin/shelters", methods=["GET"])
    def get_shelters():
        try:
            shelters = Shelter.objects()

            result = [
                {
                    "id": str(s.id),
                    "name": s.name,
                    "lat": s.latitude,
                    "lng": s.longitude,
                    "latitude": s.latitude,
                    "longitude": s.longitude,
                    "capacity": s.total_beds,
                    "total_beds": s.total_beds,
                    "available_beds": s.available_beds,
                    "occupied_beds": getattr(s, "occupied_beds", 0),
                    "contact": getattr(s, "contact", ""),
                    "image_url": s.image_url,
                    "facilities": s.facilities,
                    "status": getattr(s, "status", "Active"),
                    "risk_level": getattr(s, "risk_level", "Low"),
                }
                for s in shelters
            ]

            return jsonify(result), 200

        except Exception as e:
            return jsonify({"message": str(e)}), 500

    @admin_bp.route("/admin/shelters", methods=["POST"])
    def add_shelter():
        try:
            data = request.get_json() or {}

            name = data.get("name")
            lat = data.get("lat") or data.get("latitude")
            lng = data.get("lng") or data.get("longitude")

            if not name or lat is None or lng is None:
                return (
                    jsonify(
                        {
                            "message": (
                                "Name, latitude, and longitude are required"
                            )
                        }
                    ),
                    400,
                )

            latitude = float(lat)
            longitude = float(lng)

            total_beds = int(
                data.get("total_beds")
                or data.get("capacity")
                or data.get("total_capacity")
                or 100
            )

            available_beds = int(
                data.get("available_beds", total_beds)
            )

            new_shelter = Shelter(
                name=name.strip(),
                location_name=data.get(
                    "location_name",
                    data.get("address", "")
                ),
                latitude=latitude,
                longitude=longitude,
                location={
                    "type": "Point",
                    "coordinates": [longitude, latitude],
                },
                total_beds=total_beds,
                available_beds=available_beds,
                occupied_beds=int(data.get("occupied_beds", 0)),
                contact=data.get("contact", ""),
                facilities=data.get(
                    "facilities",
                    "Water, Emergency Shelter, Power"
                ),
                image_url=data.get("image_url"),
                created_by_role="admin",
            )

            new_shelter.save()

            return (
                jsonify(
                    {
                        "message": "Shelter added",
                        "id": str(new_shelter.id),
                        "data": new_shelter.to_dict() if hasattr(new_shelter, 'to_dict') else {},
                    }
                ),
                201,
            )

        except (ValueError, TypeError) as e:
            return jsonify({"message": f"Invalid shelter data: {str(e)}"}), 400

        except Exception as e:
            return jsonify({"message": str(e)}), 500

    @admin_bp.route("/admin/shelters/<shelter_id>", methods=["DELETE"])
    def delete_shelter(shelter_id):
        try:
            shelter = Shelter.objects.get(id=shelter_id)

            shelter.delete()

            return jsonify({"message": "Shelter deleted"}), 200

        except Shelter.DoesNotExist:
            return jsonify({"message": "Shelter not found"}), 404

        except Exception as e:
            return jsonify({"message": str(e)}), 500

    # 5. Emergency Alerts Broadcasting (PyMongo)
    @admin_bp.route("/admin/alerts/broadcast", methods=["POST"])
    def broadcast_alert():
        data = request.get_json() or {}

        alert = {
            "region": data.get("region"),
            "severity": data.get(
                "severity", "HIGH"
            ),
            "message": data.get("message"),
            "timestamp": datetime.utcnow(),
        }

        res = mongo_db.alerts.insert_one(alert)

        return (
            jsonify(
                {
                    "message": "Emergency alert broadcasted successfully",
                    "alert_id": str(res.inserted_id),
                }
            ),
            201,
        )

    return admin_bp