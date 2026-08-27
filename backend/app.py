import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from app.extensions import bcrypt
from app.routes.auth import auth_bp
from app.routes.admin_routes import admin_bp
from app.routes.incident_routes import incident_bp

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Initialize bcrypt with app instance
bcrypt.init_app(app)

app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MONGO_URI'] = os.getenv("MONGO_URI")

# Register Blueprints directly
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(incident_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)