from flask import Blueprint

from computations.GradeImprovement import GradeImprovement
from data.db import db

_GRADE_INPUT_FIELDS = [
    "age",
    "gender",
    "attendance_percentage",
    "sleep_hours_per_night",
    "exercise_hours_per_week",
    "mental_health_rating",
    "study_hours_per_day",
]

improvement_bp = Blueprint("improvement", __name__)


@improvement_bp.route("/<student_id>/<course_code>/improve", methods=["GET"])
def improve_grade(student_id, course_code):
    student_profile = _get_student_grade_input(student_id, course_code)
    grade_improvement = GradeImprovement(student_profile)
    info = grade_improvement.genetic_algorithm()

    return {
        "current_profile": {
            "attendance_percentage": info[0]["attendance_percentage"],
            "sleep_hours_per_night": info[0]["sleep_hours_per_night"],
            "exercise_hours_per_week": info[0]["exercise_hours_per_week"],
            "mental_health_rating": info[0]["mental_health_rating"],
            "study_hours_per_day": info[0]["study_hours_per_day"],
        },
        "current_grade": info[1],
        "suggested_profile": {
            "attendance_percentage": info[2]["attendance_percentage"],
            "sleep_hours_per_night": info[2]["sleep_hours_per_night"],
            "exercise_hours_per_week": info[2]["exercise_hours_per_week"],
            "mental_health_rating": info[2]["mental_health_rating"],
            "study_hours_per_day": info[2]["study_hours_per_day"],
        },
        "predicted_improved_grade": info[3],
        "improvements": {
            "attendance_percentage": round(info[2]["attendance_percentage"] - info[0]["attendance_percentage"], 2),
            "sleep_hours_per_night": round(info[2]["sleep_hours_per_night"] - info[0]["sleep_hours_per_night"], 2),
            "exercise_hours_per_week": round(info[2]["exercise_hours_per_week"] - info[0]["exercise_hours_per_week"], 2),
            "mental_health_rating": round(info[2]["mental_health_rating"] - info[0]["mental_health_rating"], 2),
            "study_hours_per_day": round(info[2]["study_hours_per_day"] - info[0]["study_hours_per_day"], 2),
            "grade_improvement": round(info[3] - info[1], 2),
        },
    }


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
