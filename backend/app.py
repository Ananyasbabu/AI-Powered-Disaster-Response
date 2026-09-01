import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_pymongo import PyMongo

from app.extensions import bcrypt
from app.routes.auth import auth_bp
from app.routes.admin_routes import admin_bp
from app.routes.incident_routes import init_incident_routes
from predict import predict_flood_risk
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

bcrypt.init_app(app)

app.config['MONGO_URI'] = os.getenv("MONGO_URI", "mongodb://localhost:27017/disaster_guard")
mongo = PyMongo(app)
db = mongo.db

# --- ML MODEL INTEGRATION ---
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'flood_risk_xgb_model.pkl')
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, 'flood_risk_preprocessor.pkl')

ml_model = None
preprocessor = None

# 1. Load XGBoost Model
try:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            ml_model = pickle.load(f)
        print("XGBoost model loaded successfully.")
    else:
        print(f"Warning: Model file not found at {MODEL_PATH}")
except Exception as e:
    print(f"Error loading ML model: {e}")

# 2. Load Preprocessor (with fallback handling for Python version mismatches)
try:
    if os.path.exists(PREPROCESSOR_PATH):
        with open(PREPROCESSOR_PATH, 'rb') as f:
            preprocessor = pickle.load(f)
        print("Preprocessor loaded successfully.")
    else:
        print(f"Warning: Preprocessor file not found at {PREPROCESSOR_PATH}")
except Exception as e:
    print(f"Warning: Preprocessor failed to load ({e}). System will fall back to raw input array.")
    preprocessor = None
# ----------------------------

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/predict-flood', methods=['POST'])
def predict_flood():
    try:
        data = request.get_json() or {}
        
        lat = float(data.get('latitude', 0))
        lng = float(data.get('longitude', 0))

        # Pass latitude, longitude, and default values for remaining required features
        result = predict_flood_risk(
            latitude=lat,
            longitude=lng,
            elevation_m=float(data.get('elevation_m', 15.0)),
            land_use=data.get('land_use', 'Residential'),
            soil_group=data.get('soil_group', 'B'),
            drainage_density_km_per_km2=float(data.get('drainage_density_km_per_km2', 1.5)),
            storm_drain_proximity_m=float(data.get('storm_drain_proximity_m', 100.0)),
            storm_drain_type=data.get('storm_drain_type', 'Open Ditch'),
            historical_rainfall_intensity_mm_hr=float(data.get('historical_rainfall_intensity_mm_hr', 45.0))
        )

        return jsonify({
            'status': 'success',
            'risk_level': result['risk'],
            'low_probability': result['low_probability'],
            'medium_probability': result['medium_probability'],
            'high_probability': result['high_probability']
        }), 200

    except Exception as e:
        return jsonify({'error': f"Prediction error: {str(e)}"}), 400

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Initialize blueprint with MongoDB instance
incident_bp = init_incident_routes(db)

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(incident_bp, url_prefix='/api')

@app.route('/api/predict-shelters-risk', methods=['POST'])
def predict_shelters_risk():
    try:
        data = request.get_json() or {}
        shelters_list = data.get('shelters', [])

        if not shelters_list:
            return jsonify({'status': 'success', 'shelters': []}), 200

        results = []
        for s in shelters_list:
            lat = float(s.get('lat', 0))
            lng = float(s.get('lng', 0))
            
            # Predict risk using model defaults/features
            pred_result = predict_flood_risk(
                latitude=lat,
                longitude=lng,
                elevation_m=float(s.get('elevation_m', 15.0)),
                land_use='Educational',
                soil_group='B',
                drainage_density_km_per_km2=1.5,
                storm_drain_proximity_m=100.0,
                storm_drain_type='Open Ditch',
                historical_rainfall_intensity_mm_hr=45.0
            )

            # Assign safety classification based on ML prediction
            risk_label = pred_result['risk']
            is_safe = risk_label == 'Low'

            results.append({
                **s,
                'risk_level': risk_label,
                'is_safe': is_safe,
                'status': 'Safe Shelter' if is_safe else ('Caution' if risk_label == 'Medium' else 'High Risk / Unsafe'),
                'low_probability': pred_result['low_probability'],
                'medium_probability': pred_result['medium_probability'],
                'high_probability': pred_result['high_probability']
            })

        return jsonify({'status': 'success', 'shelters': results}), 200

    except Exception as e:
        return jsonify({'error': f"Shelter risk assessment failed: {str(e)}"}), 400

if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=False)

