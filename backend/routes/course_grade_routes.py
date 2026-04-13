from flask import Blueprint

from computations.GradePredictor import GradePredictor
from data.db import db
import datetime

course_grade_bp = Blueprint("course_grade_bp", __name__)

_GRADE_INPUT_FIELDS = [
    "age",
    "gender",
    "attendance_percentage",
    "sleep_hours",
    "exercise_frequency",
    "mental_health_rating",
    "study_hours_per_day",
]

grade_predictor = None


@course_grade_bp.route("/<student_id>/<course_code>/predict", methods=["GET"])
def predict_course_grade(student_id, course_code):
    student_data = _get_student_grade_input(student_id, course_code)
    if student_data is None:
        return {"error": "Student course data not found"}, 404

    try:
        predicted_grade = GradePredictor().predict_grade(student_data)
    except ValueError as exc:
        return {"error": str(exc)}, 400
    except RuntimeError as exc:
        return {"error": str(exc)}, 500

    return {
        "student_id": student_id,
        "course_code": course_code,
        "model_input": student_data,
        "predicted_grade": predicted_grade,
    }


@course_grade_bp.route("/<student_id>/<course_code>/predict", methods=["POST"])
def predict_and_save_course_grade(student_id, course_code):
    student_data = _get_student_grade_input(student_id, course_code)
    if student_data is None:
        return {"error": "Student course data not found"}, 404

    try:
        predicted_grade = GradePredictor().predict_grade(student_data)
    except ValueError as exc:
        return {"error": str(exc)}, 400
    except RuntimeError as exc:
        return {"error": str(exc)}, 500
    # Get the courses.predicted_grades ([{"grade": 75, "month": 1 }, ....]) for the student and course, and add new predicted grade to it, then save back to the database
    existing = db.table("courses").select("predicted_grades").eq("code", course_code).execute()
    if not existing.data:
        return {"error": "Course not found"}, 404
    course_row = existing.data[0]
    predicted_grades = course_row.get("predicted_grades", [])
    predicted_grades.append({"grade": predicted_grade, "month": datetime.datetime.now().month})
    db.table("courses").update({"predicted_grades": predicted_grades}).eq("code", course_code).execute()     

    # Also save this new predcted grade as the new value of courses.current_predicted_grade for the student and course
    db.table("courses").update({"current_predicted_grade": predicted_grade}).eq("code", course_code).execute()

    return {
        "student_id": student_id,
        "course_code": course_code,
        "model_input": student_data,
        "predicted_grade": predicted_grade,
        "saved": True,
    }, 201


def _get_student_grade_input(student_id, course_code):
    prelim_data = db.table("students").select("age, gender").eq("id", student_id).execute()
    
    special_data = db.table("course_specific_student_data").select("attendance_percentage, sleep_hours, exercise_frequency, mental_health_rating, study_hours_per_day").eq("student_id", student_id).eq("course_code", course_code).execute()
    if not prelim_data.data or not special_data.data:
        return None
    

    student_row = {**prelim_data.data[0], **special_data.data[0]}
    return {field: student_row.get(field) for field in _GRADE_INPUT_FIELDS}


