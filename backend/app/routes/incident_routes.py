import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
from app.services.cv_service import verify_incident_image

incident_bp = Blueprint('incident_bp', __name__)
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def init_incident_routes(db):
    @incident_bp.route('/api/incidents/report', methods=['POST'])
    def report_incident():
        if 'image' not in request.files:
            return jsonify({"status": "error", "message": "No image uploaded"}), 400

        file = request.files['image']
        incident_type = request.form.get('type')
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')
        reporter_id = request.form.get('reporter_id', 'anonymous')

        if not latitude or not longitude:
            return jsonify({"status": "error", "message": "Location coordinates required"}), 400

        filename = f"{int(datetime.utcnow().timestamp())}_{secure_filename(file.filename)}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # Execute CV Pipeline
        cv_result = verify_incident_image(filepath)

        incident_doc = {
            "reporter_id": reporter_id,
            "type": incident_type,
            "image_url": f"uploads/{filename}",
            "location": {
                "type": "Point",
                "coordinates": [float(longitude), float(latitude)]
            },
            "cv_verification": {
                "status": cv_result["status"],
                "confidence_score": cv_result["confidence_score"],
                "detected_labels": cv_result["detected_labels"]
            },
            "status": "active" if cv_result["status"] == "verified" else "pending_review",
            "created_at": datetime.utcnow()
        }

        inserted_id = db.incidents.insert_one(incident_doc).inserted_id

        return jsonify({
            "status": "success",
            "message": "Incident reported and analyzed successfully!",
            "incident_id": str(inserted_id),
            "verification": cv_result
        }), 201

    @incident_bp.route('/api/incidents/verified', methods=['GET'])
    def get_verified_incidents():
        incidents = list(db.incidents.find(
            {"cv_verification.status": "verified"},
            {"_id": 1, "type": 1, "image_url": 1, "location": 1, "created_at": 1}
        ))
        for inc in incidents:
            inc['_id'] = str(inc['_id'])
        return jsonify({"status": "success", "data": incidents}), 200

    return incident_bp