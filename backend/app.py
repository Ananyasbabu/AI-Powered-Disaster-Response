import os
from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

# Import route initializers
from routes.admin_routes import init_admin_routes
from routes.incident_routes import init_incident_routes  # Member 2 routes

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Serve static files/uploaded image evidence
app.config['UPLOAD_FOLDER'] = 'uploads'

# MongoDB Atlas Cloud Connection
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI is missing from your .env file!")

client = MongoClient(MONGO_URI)

# Connect to database
db = client["disaster_db"]

# Test connection on startup
try:
    client.admin.command('ping')
    print("✅ Connected successfully to MongoDB Atlas Cloud!")
except Exception as e:
    print("❌ Failed to connect to MongoDB Atlas:", e)

# Register Admin Routes Blueprint
admin_blueprint = init_admin_routes(db)
app.register_blueprint(admin_blueprint)

# Register Member 2 Incident Routes Blueprint
incident_blueprint = init_incident_routes(db)
app.register_blueprint(incident_blueprint)

if __name__ == "__main__":
    app.run(debug=True, port=5000)