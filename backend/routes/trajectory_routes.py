import datetime

from flask import Blueprint

from computations.TrajectoryPredictor import TrajectoryPredictor
from data.db import db

trajectory_bp = Blueprint("trajectory_bp", __name__)


@trajectory_bp.route("/<student_id>/<course_code>/predict_final_grade", methods=["POST"])
def predict_final_grade(student_id, course_code):
    course_result = (
        db.table("courses")
        .select("predicted_grades, final_exam_date")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )

    if not course_result.data:
        return {"error": "Course not found"}, 404

    course_row = course_result.data[0]
    predicted_grades = course_row.get("predicted_grades", [])
    final_date = course_row.get("final_exam_date")

    if not final_date:
        return {"error": "Final exam date not found"}, 404

    trajectory_predictor = TrajectoryPredictor(predicted_grades)
    final_month = datetime.datetime.strptime(final_date, "%Y-%m-%d").month
    predicted_final_grade = trajectory_predictor.predict_final_grade(final_month)

    (
        db.table("courses")
        .update({"final_predicted_grade": predicted_final_grade})
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )

    return {"predicted_final_grade": predicted_final_grade}
