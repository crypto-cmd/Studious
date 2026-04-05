from flask import Flask, request
from dotenv import load_dotenv
import os
from data.db import db
from routes.assignment_routes import assignment_bp
from routes.trajectory_routes import trajectory_bp


# Initialize the Flask application
app = Flask(__name__)

app.register_blueprint(assignment_bp, url_prefix="/api/assignments")
app.register_blueprint(trajectory_bp, url_prefix="/api/trajectory")


# Optional: Run the app if this file is executed directly
if __name__ == "__main__":
    app.run(debug=True)
