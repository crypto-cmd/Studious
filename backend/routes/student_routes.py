from flask import Blueprint, request

from data.db import db

student_bp = Blueprint("student_bp", __name__)


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


@student_bp.route("/<student_id>/courses", methods=["POST"])
def add_course(student_id):
    payload = request.get_json(silent=True) or {}

    code = _clean_text(payload.get("code")).upper()
    if not code:
        return {"error": "code is required"}, 400

    existing = (
        db.table("courses")
        .select("code")
        .eq("student_id", student_id)
        .eq("code", code)
        .execute()
    )
    if existing.data:
        return {"error": "Course already exists for this student"}, 409

    insert_payload = {
        "student_id": student_id,
        "code": code,
        "title": _clean_text(payload.get("title")) or None,
        "final_exam_date": _clean_text(payload.get("final_exam_date")) or None,
        "current_predicted_grade": _to_number_or_none(payload.get("current_predicted_grade")),
        "final_predicted_grade": _to_number_or_none(payload.get("final_predicted_grade")),
        "predicted_grades": payload.get("predicted_grades") if isinstance(payload.get("predicted_grades"), list) else [],
    }

    inserted = db.table("courses").insert(insert_payload).execute()
    if not inserted.data:
        return {"error": "Unable to create course"}, 500

    return inserted.data[0], 201


@student_bp.route("/<student_id>/courses/<course_code>", methods=["PATCH"])
def update_course(student_id, course_code):
    payload = request.get_json(silent=True) or {}

    existing = (
        db.table("courses")
        .select("*")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )
    if not existing.data:
        return {"error": "Course not found"}, 404

    update_data = {}

    if "code" in payload:
        next_code = _clean_text(payload.get("code")).upper()
        if not next_code:
            return {"error": "code cannot be empty"}, 400

        if next_code != course_code:
            duplicate = (
                db.table("courses")
                .select("code")
                .eq("student_id", student_id)
                .eq("code", next_code)
                .execute()
            )
            if duplicate.data:
                return {"error": "Another course with that code already exists"}, 409

        update_data["code"] = next_code

    if "title" in payload:
        update_data["title"] = _clean_text(payload.get("title")) or None

    if "final_exam_date" in payload:
        update_data["final_exam_date"] = _clean_text(payload.get("final_exam_date")) or None

    if "current_predicted_grade" in payload:
        update_data["current_predicted_grade"] = _to_number_or_none(payload.get("current_predicted_grade"))

    if "final_predicted_grade" in payload:
        update_data["final_predicted_grade"] = _to_number_or_none(payload.get("final_predicted_grade"))

    if "predicted_grades" in payload:
        predicted_grades = payload.get("predicted_grades")
        if predicted_grades is not None and not isinstance(predicted_grades, list):
            return {"error": "predicted_grades must be a list"}, 400
        update_data["predicted_grades"] = predicted_grades or []

    if not update_data:
        return {"error": "No valid fields provided to update"}, 400

    updated = (
        db.table("courses")
        .update(update_data)
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )

    if not updated.data:
        return {"error": "Unable to update course"}, 500

    return updated.data[0], 200


@student_bp.route("/<student_id>/courses/<course_code>", methods=["DELETE"])
def delete_course(student_id, course_code):
    existing = (
        db.table("courses")
        .select("*")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )
    if not existing.data:
        return {"error": "Course not found"}, 404

    deleted = (
        db.table("courses")
        .delete()
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )

    return {
        "deleted": True,
        "course": deleted.data[0] if deleted.data else existing.data[0],
    }, 200
