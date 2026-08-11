from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from routes.admin_routes import init_admin_routes

app = Flask(__name__)
CORS(app)

# MongoDB Connection
client = MongoClient("mongodb://localhost:27017/") # Adjust URI if using MongoDB Atlas
db = client["disaster_response_db"]

# Register Admin Routes Blueprint
admin_blueprint = init_admin_routes(db)
app.register_blueprint(admin_blueprint)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
