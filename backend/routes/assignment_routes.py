from flask import Flask, request, Blueprint
from data.db import db

assignment_bp = Blueprint('assignment_bp', __name__)

# Define a route for the home page
@assignment_bp.route("/<student_id>/<course_code>/create_assignment", methods=["POST"])
def create_assignment(student_id, course_code):
    assignment_title = request.get_json().get('title')
    instructions = request.get_json().get('instructions')
    from computations.PromptChunker import PromptChunker

    if not instructions:
        return {"error": "Instructions parameter is required"}, 400

    chunker = PromptChunker(instructions)
    tasks = chunker.get_tasks_from_ai(instructions)
    task_count = chunker.task_counter(tasks)
    total_xp = chunker.xp_calculator(tasks)
    saveto_db = db.table("assignments").insert({
        "student_id": student_id,
        "course_code": course_code,
        "title": assignment_title,
        "tasks": tasks,
    }).execute()

    return {
        "title": assignment_title,
        "tasks": tasks,
        "task_count": task_count,
        "total_xp": total_xp
    }

@assignment_bp.route("/<student_id>/<course_code>/<assignment_id>/complete_task/<task_id>", methods=["PATCH"])
def complete_task(student_id, course_code, assignment_id, task_id):
    # Fetch the assignment from the database
    assignment = db.table("assignments").select("*").eq("id", assignment_id).execute().data[0]
    #print(f"Fetched assignment: {assignment}")

    if not assignment:
        return {"error": "Assignment not found"}, 404

    if str(assignment["student_id"]) != student_id or assignment["course_code"] != course_code:
     #   print(f"Student ID or Course Code mismatch: {assignment['student_id']} vs {student_id}, {assignment['course_code']} vs {course_code}")
        return {"error": "Assignment does not belong to the specified student or course"}, 403

    # Update the task's completed status
    tasks = assignment["tasks"]
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = True
            break

    # Update the assignment in the database
    db.table("assignments").update({"tasks": tasks}).eq("id", assignment_id).execute()

    return {"message": "Task marked as completed"}

@assignment_bp.route("/<student_id>/<course_code>/assignments", methods=["GET"])
def get_assignments(student_id, course_code):
    assignments = db.table("assignments").select("*").eq("student_id", student_id).eq("course_code", course_code).execute().data
    return {"assignments": assignments}


@assignment_bp.route("/<student_id>/<course_code>/<assignment_id>", methods=["GET"])
def get_tasks(student_id, course_code, assignment_id):
    assignment = db.table("assignments").select("*").eq("id", assignment_id).execute().data[0]

    if not assignment:
        return {"error": "Assignment not found"}, 404

    if str(assignment["student_id"]) != student_id or assignment["course_code"] != course_code:
        return {"error": "Assignment does not belong to the specified student or course"}, 403

    return {"tasks": assignment["tasks"]}

