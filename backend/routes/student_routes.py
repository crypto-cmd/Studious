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
    name = _clean_text(student_row.get("name"))
    nickname = _clean_text(student_row.get("nickname"))

    return {
        "auth_id": student_row.get("auth_id"),
        "name": name,
        "nickname": nickname,
        "gender": _normalize_gender(student_row.get("gender")),
        "id": student_row.get("id"),
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
    if "nickname" in payload:
        nickname = _clean_text(payload.get("nickname"))
        update_data["nickname"] = nickname or None
    if "gender" in payload:
        gender = _normalize_gender(payload.get("gender"))
        update_data["gender"] = gender
    if "age" in payload:
        age_value = _to_number_or_none(payload.get("age"))
        if age_value is None:
            return {"error": "age must be a number"}, 400
        age_value = int(age_value)
        update_data["age"] = age_value
    if "name" in payload:
        name = _clean_text(payload.get("name"))
        if not name:
            return {"error": "name cannot be empty"}, 400
        update_data["name"] = name


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
    courses_result = db.table("courses").select("*").eq("student_id", student_id).execute()
    if not courses_result.data:
        return [], 200

    course_ids = [course.get("id") for course in courses_result.data if course.get("id")]
    materials_result = (
        db.table("course_materials")
        .select("course_id, filename")
        .eq("student_id", student_id)
        .in_("course_id", course_ids)
        .execute()
        if course_ids else None
    )

    materials_by_course = {}
    for row in (materials_result.data if materials_result and materials_result.data else []):
        course_id = row.get("course_id")
        filename = row.get("filename")
        if not course_id or not filename:
            continue
        materials_by_course.setdefault(course_id, []).append(filename)

    courses = []
    for course in courses_result.data:
        next_course = dict(course)
        next_course["sources"] = materials_by_course.get(course.get("id"), [])
        courses.append(next_course)

    return courses, 200


@student_bp.route("/<student_id>/courses", methods=["POST"])
def add_course(student_id):
    payload = request.get_json(silent=True) or {}

    code = _clean_text(payload.get("code")).upper()
    if not code:
        return {"error": "code is required"}, 400

    title = _clean_text(payload.get("title"))
    if not title:
        return {"error": "title is required"}, 400

    final_exam_date = _clean_text(payload.get("final_exam_date"))
    if not final_exam_date:
        return {"error": "final_exam_date is required"}, 400

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
        "title": title,
        "final_exam_date": final_exam_date,
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
        title = _clean_text(payload.get("title"))
        if not title:
            return {"error": "title cannot be empty"}, 400
        update_data["title"] = title

    if "final_exam_date" in payload:
        final_exam_date = _clean_text(payload.get("final_exam_date"))
        if not final_exam_date:
            return {"error": "final_exam_date cannot be empty"}, 400
        update_data["final_exam_date"] = final_exam_date

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

@student_bp.route("/find/<student_number>", methods=["GET"])
def find_student(student_number):
    students = (
        db.table("students")
        .select("*")
        .eq("student_number", student_number)
        .execute()
    )
    if not students.data:
        return {"error": "No student found"}, 404

    return students.data, 200