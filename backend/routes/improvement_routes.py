from flask import Blueprint, request
from computations.GradeImprovement import GradeImprovement
from data.db import db

_GRADE_INPUT_FIELDS = [
    "age",
    "gender",
    "attendance_percentage",
    "sleep_hours",
    "exercise_frequency",
    "mental_health_rating",
    "study_hours_per_day",
]


improvement_bp = Blueprint('improvement', __name__)

@improvement_bp.route('/<student_id>/<course_code>/improve', methods=['GET'])
def improve_grade(student_id, course_code):
    student_profile = _get_student_grade_input(student_id, course_code)
    grade_improvement = GradeImprovement(student_profile)
    info = grade_improvement.genetic_algorithm()

    return {
        "current_profile": {
            "attendance_percentage": info[0]["attendance_percentage"],
            "sleep_hours": info[0]["sleep_hours"],
            "exercise_frequency": info[0]["exercise_frequency"],
            "mental_health_rating": info[0]["mental_health_rating"],
            "study_hours_per_day": info[0]["study_hours_per_day"],
        },
        "current_grade": info[1],
        "suggested_profile": {
            "attendance_percentage": info[2]["attendance_percentage"],
            "sleep_hours": info[2]["sleep_hours"],
            "exercise_frequency": info[2]["exercise_frequency"],
            "mental_health_rating": info[2]["mental_health_rating"],
            "study_hours_per_day": info[2]["study_hours_per_day"],
        },
        "predicted_improved_grade": info[3],
    }
    
def _get_student_grade_input(student_id, course_code):
    prelim_data = db.table("students").select("age, gender").eq("id", student_id).execute()
    
    special_data = db.table("course_specific_student_data").select("attendance_percentage, sleep_hours, exercise_frequency, mental_health_rating, study_hours_per_day").eq("student_id", student_id).eq("course_code", course_code).execute()
    if not prelim_data.data or not special_data.data:
        return None
    

    student_row = {**prelim_data.data[0], **special_data.data[0]}
    return {field: student_row.get(field) for field in _GRADE_INPUT_FIELDS}
