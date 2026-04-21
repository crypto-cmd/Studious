from flask import Blueprint, request
from computations.vector_store.Pinecone import query_chunks
from data.db import db

assignment_bp = Blueprint("assignment_bp", __name__)


@assignment_bp.route("/<student_id>/<course_code>/create_assignment", methods=["POST"])
def create_assignment(student_id, course_code):
    payload = request.get_json(silent=True) or {}
    assignment_title = payload.get("title")
    instructions = payload.get("instructions")
    due_date = payload.get("due_date")

    if not instructions:
        return {"error": "Instructions parameter is required"}, 400

    matches = query_chunks(instructions, student_id, course_code)

    context = "\n".join([m["fields"]["text"] for m in matches])
    from computations.PromptChunker import PromptChunker

    chunker = PromptChunker(instructions)
    tasks = chunker.get_tasks_from_ai(instructions, context)
    task_count = chunker.task_counter(tasks)
    total_xp = chunker.xp_calculator(tasks)

    db.table("assignments").insert(
        {
            "context": context,
            "student_id": student_id,
            "course_code": course_code,
            "title": assignment_title,
            "tasks": tasks,
            "due_date": due_date,
        }
    ).execute()

    return {
        "title": assignment_title,
        "tasks": tasks,
        "task_count": task_count,
        "total_xp": total_xp,
    }


@assignment_bp.route("/<student_id>/<course_code>/<assignment_id>/complete_task/<task_id>", methods=["PATCH"])
def complete_task(student_id, course_code, assignment_id, task_id):
    assignment_result = db.table("assignments").select("*").eq("id", assignment_id).execute()
    assignment = assignment_result.data[0] if assignment_result.data else None

    if not assignment:
        return {"error": "Assignment not found"}, 404

    if str(assignment.get("student_id")) != student_id or assignment.get("course_code") != course_code:
        return {"error": "Assignment does not belong to the specified student or course"}, 403

    tasks = assignment.get("tasks", [])
    for task in tasks:
        if task.get("id") == task_id:
            task["completed"] = True
            break

    db.table("assignments").update({"tasks": tasks}).eq("id", assignment_id).execute()

    return {"message": "Task marked as completed"}


@assignment_bp.route("/<student_id>/<course_code>/assignments", methods=["GET"])
def get_assignments(student_id, course_code):
    assignments = (
        db.table("assignments")
        .select("*")
        .eq("student_id", student_id)
        .eq("course_code", course_code)
        .execute()
        .data
    )
    return {"assignments": assignments}


@assignment_bp.route("/<student_id>/<course_code>/<assignment_id>", methods=["GET", "PUT", "DELETE"])
def get_tasks(student_id, course_code, assignment_id):
    assignment_result = db.table("assignments").select("*").eq("id", assignment_id).execute()
    assignment = assignment_result.data[0] if assignment_result.data else None

    if not assignment:
        return {"error": "Assignment not found"}, 404

    if str(assignment.get("student_id")) != student_id or assignment.get("course_code") != course_code:
        return {"error": "Assignment does not belong to the specified student or course"}, 403

    if request.method == "GET":
        return {"tasks": assignment.get("tasks", [])}

    if request.method == "PUT":
        payload = request.get_json(silent=True) or {}
        title = payload.get("title")
        instructions = payload.get("instructions")
        due_date = payload.get("due_date")

        updates = {}

        if title is not None:
            updates["title"] = title

        if instructions is not None:
            if not str(instructions).strip():
                return {"error": "Instructions cannot be empty"}, 400
            updates["instructions"] = instructions

        if due_date is not None:
            updates["due_date"] = due_date

        if not updates:
            return {"error": "No valid fields provided for update"}, 400

        db.table("assignments").update(updates).eq("id", assignment_id).execute()
        return {"message": "Assignment updated"}

    db.table("assignments").delete().eq("id", assignment_id).execute()
    return {"message": "Assignment deleted"}
