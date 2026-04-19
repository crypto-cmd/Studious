from flask import Flask, jsonify
from dotenv import load_dotenv

from data.db import db
from routes.assignment_routes import assignment_bp
from routes.trajectory_routes import trajectory_bp
from routes.course_grade_routes import course_grade_bp
from routes.improvement_routes import improvement_bp
from routes.student_routes import student_bp
from routes.focus_session_routes import focus_session_bp

load_dotenv()  # Load environment variables from .env file

# Initialize the Flask application
app = Flask(__name__)

app.register_blueprint(assignment_bp, url_prefix="/api/assignments")
app.register_blueprint(trajectory_bp, url_prefix="/api/trajectory")
app.register_blueprint(course_grade_bp, url_prefix="/api/course-grades")
app.register_blueprint(improvement_bp, url_prefix="/api/improvement")
app.register_blueprint(student_bp, url_prefix="/api/students")
app.register_blueprint(focus_session_bp, url_prefix="/api/focus-sessions")

# Global error handler to ensure all errors return JSON
@app.errorhandler(Exception)
def handle_error(error):
    return jsonify({"error": str(error) or "An unexpected error occurred"}), 500

@app.route('/')
def home():
    return "Hello, World! This Flask app is deployed via GitHub Actions."
if __name__ == "__main__":
    app.run(debug=True)
