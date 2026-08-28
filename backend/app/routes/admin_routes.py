from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

def init_admin_routes(db):

    # 1. Admin Login
    @admin_bp.route('/admin/login', methods=['POST'])
    def admin_login():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        # Basic auth check (replace with JWT or hashed DB check as needed)
        if username == "admin" and password == "admin123":
            return jsonify({"status": "success", "token": "admin-session-token-123", "role": "admin"}), 200
        return jsonify({"status": "error", "message": "Invalid admin credentials"}), 401

    # 2. Live Dashboard Stats
    @admin_bp.route('/admin/stats', methods=['GET'])
    def get_dashboard_stats():
        total_incidents = db.incidents.count_documents({})
        pending_incidents = db.incidents.count_documents({"status": "PENDING"})
        verified_incidents = db.incidents.count_documents({"status": "VERIFIED"})
        total_shelters = db.shelters.count_documents({})
        
        return jsonify({
            "total_incidents": total_incidents,
            "pending_incidents": pending_incidents,
            "verified_incidents": verified_incidents,
            "total_shelters": total_shelters
        }), 200

    # 3. Incident Management
    @admin_bp.route('/admin/incidents', methods=['GET'])
    def get_all_incidents():
        status_filter = request.args.get('status')
        query = {}
        if status_filter:
            query['status'] = status_filter
            
        incidents = list(db.incidents.find(query))
        for item in incidents:
            item['_id'] = str(item['_id'])
        return jsonify(incidents), 200

    @admin_bp.route('/admin/incidents/<incident_id>/verify', methods=['PATCH'])
    def verify_incident(incident_id):
        data = request.get_json()
        new_status = data.get('status') # 'VERIFIED' or 'REJECTED'
        
        if new_status not in ['VERIFIED', 'REJECTED', 'PENDING']:
            return jsonify({"message": "Invalid status"}), 400

        result = db.incidents.update_one(
            {"_id": ObjectId(incident_id)},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            return jsonify({"message": "Incident not found"}), 404
            
        return jsonify({"message": f"Incident updated to {new_status}"}), 200

    # 4. Shelter Management (CRUD)
    @admin_bp.route('/admin/shelters', methods=['GET'])
    def get_shelters():
        shelters = list(db.shelters.find({}))
        for s in shelters:
            s['_id'] = str(s['_id'])
        return jsonify(shelters), 200

    @admin_bp.route('/admin/shelters', methods=['POST'])
    def add_shelter():
        data = request.get_json()
        new_shelter = {
            "name": data.get("name"),
            "location": {
                "lat": float(data.get("lat", 0.0)),
                "lng": float(data.get("lng", 0.0))
            },
            "total_capacity": int(data.get("total_capacity", 0)),
            "occupied_beds": int(data.get("occupied_beds", 0)),
            "contact": data.get("contact", ""),
            "status": data.get("status", "OPEN") # OPEN, FULL, CLOSED
        }
        res = db.shelters.insert_one(new_shelter)
        return jsonify({"message": "Shelter added", "id": str(res.inserted_id)}), 201

    @admin_bp.route('/admin/shelters/<shelter_id>', methods=['DELETE'])
    def delete_shelter(shelter_id):
        db.shelters.delete_one({"_id": ObjectId(shelter_id)})
        return jsonify({"message": "Shelter deleted"}), 200

    # 5. Emergency Alerts Broadcasting
    @admin_bp.route('/admin/alerts/broadcast', methods=['POST'])
    def broadcast_alert():
        data = request.get_json()
        alert = {
            "region": data.get("region"),
            "severity": data.get("severity", "HIGH"), # HIGH, MEDIUM, CRITICAL
            "message": data.get("message"),
            "timestamp": datetime.utcnow()
        }
        res = db.alerts.insert_one(alert)
        return jsonify({"message": "Emergency alert broadcasted successfully", "alert_id": str(res.inserted_id)}), 201

    return admin_bp
