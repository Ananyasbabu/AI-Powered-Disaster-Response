import os
import pickle
import numpy as np
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_pymongo import PyMongo

from app.extensions import bcrypt
from app.routes.auth import auth_bp
from app.routes.admin_routes import admin_bp
from app.routes.incident_routes import init_incident_routes

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

bcrypt.init_app(app)

app.config['MONGO_URI'] = os.getenv("MONGO_URI", "mongodb://localhost:27017/disaster_guard")
mongo = PyMongo(app)
db = mongo.db

# --- ML MODEL INTEGRATION ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
try:
    with open(MODEL_PATH, 'rb') as f:
        ml_model = pickle.load(f)
    print("ML Model loaded successfully.")
except Exception as e:
    print(f"Warning: ML model not found or failed to load ({e}).")
    ml_model = None

@app.route('/api/predict-flood', methods=['POST'])
def predict_flood():
    if not ml_model:
        return jsonify({'error': 'ML model is not loaded on server.'}), 500
    
    try:
        data = request.get_json()
        rainfall = float(data.get('rainfall', 0))
        river_level = float(data.get('riverLevel', 0))
        humidity = float(data.get('humidity', 0))

        # Adjust shape based on how your ML model was trained
        features = np.array([[rainfall, river_level, humidity]])
        prediction = ml_model.predict(features)[0]

        probability = None
        if hasattr(ml_model, "predict_proba"):
            probability = round(float(np.max(ml_model.predict_proba(features))) * 100, 2)

        risk_mapping = {0: 'Low Risk', 1: 'Moderate Risk', 2: 'High Risk'}
        risk_label = risk_mapping.get(prediction, str(prediction))

        return jsonify({
            'status': 'success',
            'risk_level': risk_label,
            'probability': probability
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400
# ----------------------------

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Initialize blueprint with MongoDB instance
incident_bp = init_incident_routes(db)

app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(incident_bp, url_prefix='/api')

if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=False)