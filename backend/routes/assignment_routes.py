from flask import Blueprint, request
from computations.vector_store.Pinecone import query_chunks
from data.db import db

from computations.PromptChunker import PromptChunker


assignment_bp = Blueprint("assignment_bp", __name__)


def _get_course_for_student(student_id, course_code):
    course_result = (
        db.table("courses")
        .select("id, code")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )

    if not course_result.data:
        return None

    return course_result.data[0]


@assignment_bp.route("/<student_id>/<course_code>/create_assignment", methods=["POST"])
def create_assignment(student_id, course_code):
    payload = request.get_json() or {}
    assignment_title = payload.get("title")
    instructions = payload.get("instructions")
    due_date = payload.get("due_date")

    if not instructions:
        return {"error": "Instructions parameter is required"}, 400
    if not assignment_title:
        return {"error": "Title parameter is required"}, 400
    if not due_date:
        return {"error": "Due date parameter is required"}, 400

    course = _get_course_for_student(student_id, course_code)
    if course is None:
        return {"error": "Course not found"}, 404
    
    matches = query_chunks(instructions, student_id, course_code)

    context = "\n".join([m["fields"]["text"] for m in matches])

    chunker = PromptChunker(instructions)
    tasks = chunker.get_tasks_from_ai(instructions, context)
    task_count = chunker.task_counter(tasks)
    total_xp = chunker.xp_calculator(tasks)

    assignment_result = db.table("assignments").insert(
        {
            "course_id": course["id"],
            "title": assignment_title,
            "instructions": instructions,
            "due_date": due_date,
        }
    ).execute()

    if not assignment_result.data:
        return {"error": "Unable to create assignment"}, 500

    assignment_row = assignment_result.data[0]
    task_rows = []
    for i, task in enumerate(tasks):
        task_result = db.table("tasks").insert(
            {
                "assignment_id": assignment_row["id"],
                "priority": i,
                "xp": task["xp"],
                "task": task["task"],
                "completed": False,
            }
        ).execute()
        if task_result.data:
            task_rows.append(task_result.data[0])

    all_tasks = db.table("tasks").select("*").eq("assignment_id", assignment_row["id"]).order("priority").execute().data
    
    return {
        "assignment_id": assignment_row["id"],
        "title": assignment_title,
        "tasks": all_tasks,
        "task_count": task_count,
        "total_xp": total_xp,
    }, 201


@assignment_bp.route("/<student_id>/<course_code>/<assignment_id>/complete_task/<task_id>", methods=["PATCH"])
def complete_task(student_id, course_code, assignment_id, task_id):
    assignment_result = db.table("assignments").select("*").eq("id", assignment_id).execute()
    assignment = assignment_result.data[0] if assignment_result.data else None

    if not assignment:
        return {"error": "Assignment not found"}, 404

    course = db.table("courses").select("id, student_id, code").eq("id", assignment.get("course_id")).execute().data
    if not course:
        return {"error": "Course not found"}, 404

    course_row = course[0]
    if str(course_row.get("student_id")) != student_id or course_row.get("code") != course_code:
        return {"error": "Assignment does not belong to the specified student or course"}, 403

    task = db.table("tasks").select("*").eq("id", task_id).execute().data
    if not task:
        return {"error": "Task not found"}, 404
    task = task[0]
    if task.get("assignment_id") != assignment_id:
        return {"error": "Task does not belong to the specified assignment"}, 403
    
    if task.get("completed"):
        return {"error": "Task is already marked as completed"}, 400
    
    db.table("tasks").update({"completed": True}).eq("id", task_id).execute()

    return {"message": "Task marked as completed"}, 200


@assignment_bp.route("/<student_id>/<course_code>/assignments", methods=["GET"])
def get_assignments(student_id, course_code):
    course = _get_course_for_student(student_id, course_code)
    if course is None:
        return {"error": "Course not found"}, 404

    assignments = (
        db.table("assignments")
        .select("*")
        .eq("course_id", course["id"])
        .execute()
        .data
    )
    if assignments is None:
        return {"error": "Error fetching assignments"}, 500
    return {"assignments": assignments}, 200


@assignment_bp.route("/<student_id>/<course_code>/<assignment_id>", methods=["GET"])
def get_tasks(student_id, course_code, assignment_id):
    assignment_result = db.table("assignments").select("*").eq("id", assignment_id).execute()
    assignment = assignment_result.data[0] if assignment_result.data else None

    if not assignment:
        return {"error": "Assignment not found"}, 404

    course = db.table("courses").select("id, student_id, code").eq("id", assignment.get("course_id")).execute().data
    if not course:
        return {"error": "Course not found"}, 404

    course_row = course[0]
    if str(course_row.get("student_id")) != student_id or course_row.get("code") != course_code:
        return {"error": "Assignment does not belong to the specified student or course"}, 403
    tasks = db.table("tasks").select("*").eq("assignment_id", assignment_id).execute().data

    if tasks is None:
        return {"error": "Error fetching tasks"}, 500
    return {"tasks": tasks}, 200
