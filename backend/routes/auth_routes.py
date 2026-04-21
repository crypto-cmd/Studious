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


def _to_int_or_none(value):
    number_value = _to_number_or_none(value)
    if number_value is None:
        return None

    try:
        return int(number_value)
    except (TypeError, ValueError):
        return None


def _student_response(student_row, study_row=None):
    name = _clean_text(student_row.get("name"))
    nickname = _clean_text(student_row.get("nickname"))
    study_row = study_row or {}

    return {
        "student_id": student_row.get("id"),
        "auth_id": student_row.get("auth_id"),
        "name": name,
        "nickname": nickname,
        "gender": _normalize_gender(student_row.get("gender")),
        "student_number": student_row.get("student_number"),
        "study_hours_per_day": study_row.get("study_hours_per_day"),
        "calculated_study_hours_per_day": study_row.get("calculated_study_hours_per_day"),
        "use_calculated_study_hours": bool(study_row.get("use_calculated_study_hours")),
        "sleep_hours_per_night": study_row.get("sleep_hours_per_night"),
        "exercise_hours_per_week": study_row.get("exercise_hours_per_week"),
        "mental_health_rating": study_row.get("mental_health_rating"),
    }


def _extract_study_data(payload):
    source = payload.get("student_study_data") if isinstance(payload.get("student_study_data"), dict) else payload

    return {
        "study_hours_per_day": _to_number_or_none(source.get("study_hours_per_day")),
        "use_calculated_study_hours": bool(source.get("use_calculated_study_hours")),
        "sleep_hours_per_night": _to_number_or_none(source.get("sleep_hours_per_night")),
        "exercise_hours_per_week": _to_number_or_none(source.get("exercise_hours_per_week")),
        "mental_health_rating": _to_int_or_none(source.get("mental_health_rating")),
    }


@auth_bp.route("/student-profile", methods=["POST"])
def create_student_profile_from_auth():
    payload = request.get_json(silent=True) or {}

    auth_id = _clean_text(payload.get("auth_id"))
    name = _clean_text(payload.get("name"))
    nickname = _clean_text(payload.get("nickname"))
    student_id = _clean_text(payload.get("student_id"))
    gender = _normalize_gender(payload.get("gender"))
    age_value = _to_int_or_none(payload.get("age"))
    onboarding = payload.get("onboarding") if isinstance(payload.get("onboarding"), dict) else {}

    if not auth_id or not name or not student_id or not gender:
        return {
            "error": "auth_id, name, student_id, and gender are required"
        }, 400

    if age_value is None:
        return {"error": "age is required"}, 400

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
                "name": name,
                "nickname": nickname,
                "student_number": student_id,
                "gender": gender,
                "age": age_value,
            }
        )
        .execute()
    )

    if not inserted.data:
        return {"error": "Unable to create student profile"}, 500

    student_row = inserted.data[0]

    study_data = {
        "study_hours_per_day": _to_number_or_none(onboarding.get("study_hours_per_day")),
        "use_calculated_study_hours": bool(onboarding.get("use_calculated_study_hours")),
        "sleep_hours_per_night": _to_number_or_none(onboarding.get("sleep_hours_per_night")),
        "exercise_hours_per_week": _to_number_or_none(onboarding.get("exercise_hours_per_week")),
        "mental_health_rating": _to_int_or_none(onboarding.get("mental_health_rating")),
    }

    required_study_fields = [
        study_data["study_hours_per_day"],
        study_data["sleep_hours_per_night"],
        study_data["exercise_hours_per_week"],
        study_data["mental_health_rating"],
    ]

    if all(value is not None for value in required_study_fields):
        db.table("student_study_data").insert(
            {
                "student_id": student_row.get("id"),
                **study_data,
            }
        ).execute()

    return _student_response(student_row, study_data), 201


@auth_bp.route("/student-profile/<auth_id>", methods=["GET"])
def get_student_profile_by_auth_id(auth_id):
    result = db.table("students").select("*").eq("auth_id", auth_id).execute()

    if not result.data:
        return {"error": "Student not found"}, 404

    study_result = db.table("student_study_data").select("*").eq("student_id", result.data[0].get("id")).execute()
    study_row = study_result.data[0] if study_result.data else None

    return _student_response(result.data[0], study_row), 200


@auth_bp.route("/student-profile/<auth_id>", methods=["PATCH"])
def update_student_profile_by_auth_id(auth_id):
    payload = request.get_json(silent=True) or {}

    update_data = {}
    if "name" in payload:
        name = _clean_text(payload.get("name"))
        if not name:
            return {"error": "name cannot be empty"}, 400
        update_data["name"] = name
    if "nickname" in payload:
        nickname = _clean_text(payload.get("nickname"))
        update_data["nickname"] = nickname or None

    study_data = _extract_study_data(payload)
    has_study_update = any(payload_key in payload or (isinstance(payload.get("student_study_data"), dict) and payload_key in payload["student_study_data"]) for payload_key in ["study_hours_per_day", "use_calculated_study_hours", "sleep_hours_per_night", "exercise_hours_per_week", "mental_health_rating"])

    existing = db.table("students").select("*").eq("auth_id", auth_id).execute()
    if not existing.data:
        return {"error": "Student not found"}, 404

    existing_row = existing.data[0]
    study_existing = db.table("student_study_data").select("*").eq("student_id", existing_row.get("id")).execute()
    study_row = study_existing.data[0] if study_existing.data else None

    if not update_data and not has_study_update:
        return {"error": "No valid fields provided to update"}, 400

    if update_data:
        updated = (
            db.table("students")
            .update(update_data)
            .eq("auth_id", auth_id)
            .execute()
        )

        if not updated.data:
            return {"error": "Unable to update student profile"}, 500

        existing_row = updated.data[0]

    if has_study_update:
        merged_study = {
            "student_id": existing_row.get("id"),
            "study_hours_per_day": study_data["study_hours_per_day"] if study_data["study_hours_per_day"] is not None else (study_row or {}).get("study_hours_per_day"),
            "use_calculated_study_hours": study_data["use_calculated_study_hours"] if "use_calculated_study_hours" in payload or (isinstance(payload.get("student_study_data"), dict) and "use_calculated_study_hours" in payload["student_study_data"]) else bool((study_row or {}).get("use_calculated_study_hours")),
            "sleep_hours_per_night": study_data["sleep_hours_per_night"] if study_data["sleep_hours_per_night"] is not None else (study_row or {}).get("sleep_hours_per_night"),
            "exercise_hours_per_week": study_data["exercise_hours_per_week"] if study_data["exercise_hours_per_week"] is not None else (study_row or {}).get("exercise_hours_per_week"),
            "mental_health_rating": study_data["mental_health_rating"] if study_data["mental_health_rating"] is not None else (study_row or {}).get("mental_health_rating"),
        }

        required_study_fields = [
            merged_study["study_hours_per_day"],
            merged_study["sleep_hours_per_night"],
            merged_study["exercise_hours_per_week"],
            merged_study["mental_health_rating"],
        ]
        if all(value is not None for value in required_study_fields):
            if study_row:
                db.table("student_study_data").update({
                    "study_hours_per_day": merged_study["study_hours_per_day"],
                    "use_calculated_study_hours": merged_study["use_calculated_study_hours"],
                    "sleep_hours_per_night": merged_study["sleep_hours_per_night"],
                    "exercise_hours_per_week": merged_study["exercise_hours_per_week"],
                    "mental_health_rating": merged_study["mental_health_rating"],
                }).eq("student_id", existing_row.get("id")).execute()
            else:
                db.table("student_study_data").insert(merged_study).execute()
        else:
            return {"error": "study data requires study_hours_per_day, sleep_hours_per_night, exercise_hours_per_week, and mental_health_rating"}, 400

    refreshed_study = db.table("student_study_data").select("*").eq("student_id", existing_row.get("id")).execute()
    current_study = refreshed_study.data[0] if refreshed_study.data else study_row

    return _student_response(existing_row, current_study), 200
