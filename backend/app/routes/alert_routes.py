from flask import Blueprint, jsonify, request
from bson.objectid import ObjectId

# Computer vision hazard labels to check against proof image
HAZARD_CLASSES = {"flood", "waterlogging", "fallen_tree", "landslide", "debris"}
CONFIDENCE_THRESHOLD = 0.40


def init_alert_routes(db):
    alert_bp = Blueprint('alert_bp', __name__)

    @alert_bp.route('/alerts/active', methods=['GET'])
    def get_active_alerts():
        """Fetch all verified or high-severity active alerts for the main feed."""
        alerts = list(db.incidents.find({
            "$or": [
                {"status": "verified"},
                {"severity": "High"}
            ]
        }).sort("created_at", -1).limit(20))

        for alert in alerts:
            alert['_id'] = str(alert['_id'])

        return jsonify({"status": "success", "count": len(alerts), "alerts": alerts}), 200

    @alert_bp.route('/alerts/nearby', methods=['GET'])
    def get_nearby_alerts():
        """Fetch alerts near specific coordinates (Default: within 5km radius)."""
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius_km = request.args.get('radius', default=5, type=float)

        if not lat or not lng:
            return jsonify({"status": "error", "message": "Latitude and longitude required"}), 400

        # Geospatial query (Requires 2dsphere index on location field)
        meters = radius_km * 1000
        alerts = list(db.incidents.find({
            "location": {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]
                    },
                    "$maxDistance": meters
                }
            },
            "status": "verified"
        }).sort("created_at", -1))

        for alert in alerts:
            alert['_id'] = str(alert['_id'])

        return jsonify({"status": "success", "data": alerts}), 200

    @alert_bp.route('/incidents/<incident_id>/resolve', methods=['POST'])
    def resolve_incident_cv(incident_id):
        """Verify image with CV model before resolving and deleting an incident."""
        if 'image' not in request.files:
            return jsonify({"status": "error", "message": "No proof image uploaded"}), 400

        file = request.files['image']

        # Execute computer vision model inference
        # Replace run_cv_model with your actual ML model evaluation call
        cv_results = run_cv_model(file)

        detected_labels = cv_results.get("detected_labels", [])
        confidence_score = cv_results.get("confidence_score", 0.0)

        # Reject resolution if hazard is still detected in the uploaded image
        hazard_detected = any(
            label.lower() in HAZARD_CLASSES and confidence_score >= CONFIDENCE_THRESHOLD
            for label in detected_labels
        )

        if hazard_detected:
            return jsonify({
                "status": "error",
                "message": "CV Verification Failed: The uploaded image still shows active hazards. Incident remains active.",
                "cv_result": cv_results
            }), 400

        # Remove resolved incident from DB if image shows hazard is gone
        query_filter = {"_id": ObjectId(incident_id)} if ObjectId.is_valid(incident_id) else {"_id": incident_id}
        result = db.incidents.delete_one(query_filter)

        if result.deleted_count == 0:
            return jsonify({"status": "error", "message": "Incident not found"}), 404

        return jsonify({
            "status": "success",
            "message": "Resolution verified by CV! Incident resolved and deleted from database."
        }), 200

    return alert_bp