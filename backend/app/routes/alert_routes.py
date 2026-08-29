from flask import Blueprint, jsonify, request
from bson.objectid import ObjectId

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

    return alert_bp