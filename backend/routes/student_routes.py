from flask import Blueprint, request

from data.db import db

student_bp = Blueprint("student_bp", __name__)


def _clean_text(value):
    return str(value or "").strip()


def _normalize_gender(value):
    return _clean_text(value).lower()


def _build_display_name(student_row):
    nickname = _clean_text(student_row.get("nickname"))
    firstname = _clean_text(student_row.get("firstname"))
    lastname = _clean_text(student_row.get("lastname"))
    legacy_name = _clean_text(student_row.get("name"))

    if nickname:
        return nickname

    full_name = " ".join(part for part in [firstname, lastname] if part)
    if full_name:
        return full_name

    return legacy_name


def _student_response(student_row):
    firstname = _clean_text(student_row.get("firstname"))
    lastname = _clean_text(student_row.get("lastname"))
    nickname = _clean_text(student_row.get("nickname"))
    legacy_name = _clean_text(student_row.get("name"))

    if not firstname and not lastname and legacy_name:
        name_parts = legacy_name.split()
        firstname = name_parts[0] if name_parts else ""
        lastname = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

    return {
        "student_id": student_row.get("id"),
        "auth_id": student_row.get("auth_id"),
        "firstname": firstname,
        "lastname": lastname,
        "nickname": nickname,
        "gender": _normalize_gender(student_row.get("gender")),
        "profile_student_id": student_row.get("student_id"),
        "name": _build_display_name(student_row),
    }


@student_bp.route("", methods=["POST"])
def create_student_profile():
    payload = request.get_json(silent=True) or {}
    auth_id = _clean_text(payload.get("auth_id"))
    firstname = _clean_text(payload.get("firstname"))
    lastname = _clean_text(payload.get("lastname"))
    nickname = _clean_text(payload.get("nickname"))
    student_id = _clean_text(payload.get("student_id"))
    gender = _normalize_gender(payload.get("gender"))
    legacy_name = _clean_text(payload.get("name"))

    if not firstname and not lastname and legacy_name:
        name_parts = legacy_name.split()
        firstname = name_parts[0] if name_parts else ""
        lastname = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

    if not nickname:
        nickname = legacy_name

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

    inserted = db.table("students").insert(
        {
            "auth_id": auth_id,
            "firstname": firstname,
            "lastname": lastname,
            "nickname": nickname,
            "student_id": student_id,
            "gender": gender,
        }
    ).execute()
    if not inserted.data:
        return {"error": "Unable to create student profile"}, 500

    student_row = inserted.data[0]
    return _student_response(student_row), 201


@student_bp.route("/<auth_id>", methods=["GET"])
def get_student_by_auth_id(auth_id):
    result = db.table("students").select("*").eq("auth_id", auth_id).execute()

    if not result.data:
        return {"error": "Student not found"}, 404

    student_row = result.data[0]

    return _student_response(student_row)

@student_bp.route("/<student_id>/courses", methods=["GET"])
def get_courses(student_id):
    courses = db.table("courses").select("*").eq("student_id",student_id).execute()
    return courses, 200

