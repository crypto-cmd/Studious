from flask import Flask, request, Blueprint
from data.db import db
from computations.TrajectoryPredictor import TrajectoryPredictor
import datetime

trajectory_bp = Blueprint('trajectory_bp', __name__)

@trajectory_bp.route("/<student_id>/<course_code>/predict_final_grade", methods=["POST"])
def predict_final_grade(student_id, course_code):
    predicted_grade = db.table("courses").select("predicted_grades").eq("student_id", student_id).eq("code", course_code).execute().data[0].get("predicted_grades", [])
    
    print(f"Predicted grades for student {student_id} in course {course_code}: {predicted_grade}")
    trajectory_predictor = TrajectoryPredictor(predicted_grade)
    
    final_date = db.table("courses").select("final_exam_date").eq("student_id", student_id).eq("code", course_code).execute().data[0]["final_exam_date"]
    final_month = (datetime.datetime.strptime(final_date, "%Y-%m-%d").month)
    predicted_final_grade = trajectory_predictor.predict_final_grade(final_month)

    db.table("courses").update({"final_predicted_grade": predicted_final_grade}).eq("student_id", student_id).eq("code", course_code).execute()
    
    return {"predicted_final_grade": predicted_final_grade}