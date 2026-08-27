import os
from flask import Flask, send_from_directory
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
    app.run(debug=True, port=5000)