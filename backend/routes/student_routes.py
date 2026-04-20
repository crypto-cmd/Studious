from flask import Blueprint, request

from data.db import db

student_bp = Blueprint("student_bp", __name__)


def _clean_text(value):
    return str(value or "").strip()


def _normalize_gender(value):
    return _clean_text(value).lower()


def _student_response(student_row):
    firstname = _clean_text(student_row.get("firstname"))
    lastname = _clean_text(student_row.get("lastname"))
    nickname = _clean_text(student_row.get("nickname"))

    return {
        "auth_id": student_row.get("auth_id"),
        "firstname": firstname,
        "lastname": lastname,
        "nickname": nickname,
        "gender": _normalize_gender(student_row.get("gender")),
        "id": student_row.get("student_id"),
    }


@student_bp.route("/<student_id>", methods=["GET"])
def get_student(student_id):
    result = db.table("students").select("*").eq("id", student_id).execute()

    if not result.data:
        return {"error": "Student not found"}, 404

    return _student_response(result.data[0])


@student_bp.route("/<student_id>", methods=["PATCH"])
def update_student_profile(student_id):
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

    existing = db.table("students").select("*").eq("id", student_id).execute()
    if not existing.data:
        return {"error": "Student not found"}, 404

    updated = (
        db.table("students")
        .update(update_data)
        .eq("id", student_id)
        .execute()
    )

    if not updated.data:
        return {"error": "Unable to update student profile"}, 500

    return _student_response(updated.data[0]), 200


@student_bp.route("/<student_id>/courses", methods=["GET"])
def get_courses(student_id):
    courses = db.table("courses").select("*").eq("student_id", student_id).execute()
    return courses.data, 200
