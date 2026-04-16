from flask import Blueprint, request

from data.db import db

student_bp = Blueprint("student_bp", __name__)


@student_bp.route("", methods=["POST"])
def create_student_profile():
    payload = request.get_json(silent=True) or {}
    auth_id = str(payload.get("auth_id", "")).strip()
    name = str(payload.get("name", "")).strip()

    if not auth_id or not name:
        return {"error": "auth_id and name are required"}, 400

    existing = db.table("students").select("id, name, auth_id").eq("auth_id", auth_id).execute()
    if existing.data:
        existing_row = existing.data[0]
        return {
            "error": "Student profile already exists",
            "student_id": existing_row.get("id"),
            "auth_id": existing_row.get("auth_id"),
            "name": existing_row.get("name"),
        }, 409

    inserted = db.table("students").insert({"auth_id": auth_id, "name": name}).execute()
    if not inserted.data:
        return {"error": "Unable to create student profile"}, 500

    student_row = inserted.data[0]
    return {
        "student_id": student_row.get("id"),
        "auth_id": student_row.get("auth_id"),
        "name": student_row.get("name"),
    }, 201


@student_bp.route("/<auth_id>", methods=["GET"])
def get_student_by_auth_id(auth_id):
    result = db.table("students").select("id, name, auth_id").eq("auth_id", auth_id).execute()

    if not result.data:
        return {"error": "Student not found"}, 404

    student_row = result.data[0]

    return {
        "student_id": student_row.get("id"),
        "auth_id": student_row.get("auth_id"),
        "name": student_row.get("name"),
    }



