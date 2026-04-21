import datetime

from flask import Blueprint

from computations.GradePredictor import GradePredictor
from data.db import db

course_grade_bp = Blueprint("course_grade_bp", __name__)

_GRADE_INPUT_FIELDS = [
    "age",
    "gender",
    "attendance_percentage",
    "sleep_hours_per_night",
    "exercise_hours_per_week",
    "mental_health_rating",
    "study_hours_per_day",
]


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

    existing = (
        db.table("courses")
        .select("predicted_grades")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )
    if not existing.data:
        return {"error": "Course not found"}, 404

    course_row = existing.data[0]
    predicted_grades = course_row.get("predicted_grades", [])
    predicted_grades.append({"grade": predicted_grade, "month": datetime.datetime.now().month})

    db.table("courses").update({"predicted_grades": predicted_grades}).eq("student_id", student_id).eq("code", course_code).execute()
    db.table("courses").update({"current_predicted_grade": predicted_grade}).eq("student_id", student_id).eq("code", course_code).execute()

    return {
        "student_id": student_id,
        "course_code": course_code,
        "model_input": student_data,
        "predicted_grade": predicted_grade,
        "saved": True,
    }, 201


def _get_student_grade_input(student_id, course_code):
    prelim_data = db.table("students").select("age, gender").eq("id", student_id).execute()

    course_data = (
        db.table("courses")
        .select("attendance_percentage")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )

    special_data = (
        db.table("student_study_data")
        .select("sleep_hours_per_night, exercise_hours_per_week, mental_health_rating, study_hours_per_day, calculated_study_hours_per_day, use_calculated_study_hours")
        .eq("student_id", student_id)
        .execute()
    )

    if not prelim_data.data or not course_data.data or not special_data.data:
        return None

    student_row = {**prelim_data.data[0], **course_data.data[0], **special_data.data[0]}
    effective_study_hours = student_row.get("study_hours_per_day")
    if student_row.get("use_calculated_study_hours") and student_row.get("calculated_study_hours_per_day") is not None:
        effective_study_hours = student_row.get("calculated_study_hours_per_day")

    student_row["study_hours_per_day"] = effective_study_hours

    return {field: student_row.get(field) for field in _GRADE_INPUT_FIELDS}
