import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
from app.services.cv_service import verify_incident_image
from app.services.weather_service import verify_with_weather  # Imports weather service

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def init_incident_routes(db):
    incident_bp = Blueprint('incident_bp', __name__)

    @incident_bp.route('/incidents/report', methods=['POST'])
    def report_incident():
        if 'image' not in request.files:
            return jsonify({"status": "error", "message": "No image uploaded"}), 400

        file = request.files['image']
        incident_type = request.form.get('type', 'Flood')
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')
        reporter_id = request.form.get('reporter_id', 'anonymous')
        description = request.form.get('description', '')
        severity = request.form.get('severity', 'Medium')

        if not latitude or not longitude:
            return jsonify({"status": "error", "message": "Location coordinates required"}), 400

        filename = f"{int(datetime.utcnow().timestamp())}_{secure_filename(file.filename)}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # 1. Computer Vision Verification
        cv_result = verify_incident_image(filepath)

        # 2. Live Weather API Verification
        weather_result = verify_with_weather(float(latitude), float(longitude), incident_type)

        # 3. Overall Verification Logic (Verified if CV OR Weather confirms high confidence)
        is_cv_verified = cv_result.get("status") == "verified"
        is_weather_verified = weather_result.get("verified", False)

        if is_cv_verified and is_weather_verified:
            final_status = "verified"
            overall_confidence = "High"
        elif is_cv_verified or is_weather_verified:
            final_status = "verified"
            overall_confidence = "Medium"
        else:
            final_status = "pending_review"
            overall_confidence = "Low"

        incident_doc = {
            "reporter_id": reporter_id,
            "type": incident_type,
            "severity": severity,
            "description": description,
            "image_url": f"uploads/{filename}",
            "location": {
                "type": "Point",
                "coordinates": [float(longitude), float(latitude)]
            },
            "cv_verification": {
                "status": cv_result.get("status", "pending"),
                "confidence_score": cv_result.get("confidence_score", 0.0),
                "detected_labels": cv_result.get("detected_labels", [])
            },
            "weather_verification": weather_result,
            "overall_confidence": overall_confidence,
            "status": final_status,
            "created_at": datetime.utcnow()
        }

        inserted_id = db.incidents.insert_one(incident_doc).inserted_id

        return jsonify({
            "status": "success",
            "message": "Incident reported and analyzed successfully!",
            "incident_id": str(inserted_id),
            "verification": {
                "cv": cv_result,
                "weather": weather_result,
                "overall_status": final_status
            }
        }), 201

    @incident_bp.route('/incidents/verified', methods=['GET'])
    def get_verified_incidents():
        incidents = list(db.incidents.find({
            "$or": [
                {"status": "verified"},
                {"cv_verification.status": "verified"},
                {"weather_verification.verified": True}
            ]
        }))
        for inc in incidents:
            inc['_id'] = str(inc['_id'])
        return jsonify({"status": "success", "data": incidents}), 200

    return incident_bp