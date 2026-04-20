from flask import Blueprint, request

from data.db import db

auth_bp = Blueprint("auth_bp", __name__)


def _clean_text(value):
    return str(value or "").strip()


def _normalize_gender(value):
    return _clean_text(value).lower()


def _to_number_or_none(value):
    if value is None or value == "":
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _student_response(student_row):
    firstname = _clean_text(student_row.get("firstname"))
    lastname = _clean_text(student_row.get("lastname"))
    nickname = _clean_text(student_row.get("nickname"))

    return {
        "student_id": student_row.get("id"),
        "auth_id": student_row.get("auth_id"),
        "firstname": firstname,
        "lastname": lastname,
        "nickname": nickname,
        "gender": _normalize_gender(student_row.get("gender")),
        "id": student_row.get("student_id"),
    }


@auth_bp.route("/student-profile", methods=["POST"])
def create_student_profile_from_auth():
    payload = request.get_json(silent=True) or {}

    auth_id = _clean_text(payload.get("auth_id"))
    firstname = _clean_text(payload.get("firstname"))
    lastname = _clean_text(payload.get("lastname"))
    nickname = _clean_text(payload.get("nickname"))
    student_id = _clean_text(payload.get("student_id"))
    gender = _normalize_gender(payload.get("gender"))
    age_value = _to_number_or_none(payload.get("age"))
    onboarding = payload.get("onboarding") if isinstance(payload.get("onboarding"), dict) else {}

    if not auth_id or not firstname or not lastname or not nickname or not student_id or not gender:
        return {
            "error": "auth_id, firstname, lastname, nickname, student_id, and gender are required"
        }, 400

    if gender not in {"male", "female", "other"}:
        return {"error": "gender must be one of: male, female, other"}, 400

    existing = db.table("students").select("*").eq("auth_id", auth_id).execute()
    if existing.data:
        existing_row = existing.data[0]
        return {
            "error": "Student profile already exists",
            **_student_response(existing_row),
        }, 409

    inserted = (
        db.table("students")
        .insert(
            {
                "auth_id": auth_id,
                "firstname": firstname,
                "lastname": lastname,
                "nickname": nickname,
                "id": student_id,
                "gender": gender,
                "age": age_value,
            }
        )
        .execute()
    )

    if not inserted.data:
        return {"error": "Unable to create student profile"}, 500

    student_row = inserted.data[0]

    sleep_hours = _to_number_or_none(onboarding.get("sleep_hours"))
    exercise_frequency = _to_number_or_none(onboarding.get("exercise_frequency"))
    mental_health_rating = _to_number_or_none(onboarding.get("mental_health_rating"))

    if any(value is not None for value in [sleep_hours, exercise_frequency, mental_health_rating]):
        db.table("course_specific_student_data").insert(
            {
                "student_id": student_row.get("id"),
                "course_code": "__onboarding__",
                "sleep_hours": sleep_hours,
                "exercise_frequency": exercise_frequency,
                "mental_health_rating": mental_health_rating,
            }
        ).execute()

    return _student_response(student_row), 201


@auth_bp.route("/student-profile/<auth_id>", methods=["GET"])
def get_student_profile_by_auth_id(auth_id):
    result = db.table("students").select("*").eq("auth_id", auth_id).execute()

    if not result.data:
        return {"error": "Student not found"}, 404

    return _student_response(result.data[0]), 200


@auth_bp.route("/student-profile/<auth_id>", methods=["PATCH"])
def update_student_profile_by_auth_id(auth_id):
    payload = request.get_json(silent=True) or {}

    update_data = {}
    if "firstname" in payload:
        firstname = _clean_text(payload.get("firstname"))
        if not firstname:
            return {"error": "firstname cannot be empty"}, 400
        update_data["firstname"] = firstname
    if "lastname" in payload:
        lastname = _clean_text(payload.get("lastname"))
        if not lastname:
            return {"error": "lastname cannot be empty"}, 400
        update_data["lastname"] = lastname
    if "nickname" in payload:
        nickname = _clean_text(payload.get("nickname"))
        if not nickname:
            return {"error": "nickname cannot be empty"}, 400
        update_data["nickname"] = nickname

    if not update_data:
        return {"error": "No valid fields provided to update"}, 400

    existing = db.table("students").select("*").eq("auth_id", auth_id).execute()
    if not existing.data:
        return {"error": "Student not found"}, 404

    updated = (
        db.table("students")
        .update(update_data)
        .eq("auth_id", auth_id)
        .execute()
    )

    if not updated.data:
        return {"error": "Unable to update student profile"}, 500

    return _student_response(updated.data[0]), 200
