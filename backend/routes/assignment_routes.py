from datetime import datetime, timezone
from urllib.parse import quote

import httpx
from flask import Blueprint, request
from computations.vector_store.Pinecone import query_chunks
from data.db import db
from routines.focus_kde import run_kde_for_student

from computations.PromptChunker import PromptChunker
from computations.TaskScheduler import build_schedule_plan


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


def _student_calendar_credentials(student_row):
    return {
        "google_calendar_id": student_row.get("google_calendar_id"),
        "google_calendar_access_token": student_row.get("google_calendar_access_token"),
    }


def _get_assignment_schedule_state(assignment_id):
    schedule_result = (
        db.table("assignment_calendar_schedules")
        .select("assignment_id, schedule_status, scheduled_at, calendar_event_ids")
        .eq("assignment_id", assignment_id)
        .execute()
    )

    if not schedule_result.data:
        return None

    return schedule_result.data[0]


def _extract_event_ids(calendar_event_ids):
    if not isinstance(calendar_event_ids, list):
        return []

    event_ids = []
    for item in calendar_event_ids:
        if isinstance(item, str):
            event_id = item.strip()
        elif isinstance(item, dict):
            event_id = str(item.get("event_id") or item.get("id") or "").strip()
        else:
            event_id = ""

        if event_id:
            event_ids.append(event_id)

    return event_ids


def _save_assignment_schedule_state(assignment_id, created_events):
    payload = {
        "assignment_id": assignment_id,
        "schedule_status": "scheduled",
        "scheduled_at": datetime.now(timezone.utc).isoformat(),
        "calendar_event_ids": created_events,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    existing = _get_assignment_schedule_state(assignment_id)
    if existing:
        db.table("assignment_calendar_schedules").update(payload).eq("assignment_id", assignment_id).execute()
    else:
        db.table("assignment_calendar_schedules").insert(payload).execute()


def _clear_assignment_schedule_state(assignment_id):
    db.table("assignment_calendar_schedules").delete().eq("assignment_id", assignment_id).execute()


def _create_google_calendar_events(
    schedule_plan,
    tasks,
    assignment,
    course_code,
    calendar_credentials,
    calendar_client,
):
    access_token = str(calendar_credentials.get("google_calendar_access_token") or "").strip()
    calendar_id = str(calendar_credentials.get("google_calendar_id") or "").strip() or "primary"

    if not access_token:
        return [], "Missing Google Calendar access token.", []

    tasks_by_id = {str(task.get("id")): task for task in tasks}
    created_events = []
    event_failures = []

    for scheduled_task in schedule_plan.get("scheduled_tasks", []):
        task_id = str(scheduled_task.get("task_id") or "")
        task_row = tasks_by_id.get(task_id)
        if not task_id or task_row is None:
            continue

        task_priority = int(scheduled_task.get("priority") or 0)
        task_summary = task_row.get("task") or "Task"

        event_payload = {
            "summary": f"{assignment.get('title')} - Priority {task_priority + 1}",
            "description": (
                f"Course: {course_code}\n"
                f"Assignment: {assignment.get('title')}\n"
                f"Task priority: {task_priority + 1}\n"
                f"Task: {task_summary}\n"
                f"Auto-scheduled by Studious."
            ),
            "start": {"dateTime": scheduled_task.get("start")},
            "end": {"dateTime": scheduled_task.get("end")},
        }

        try:
            response = calendar_client.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id, safe='')}/events",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=event_payload,
            )
            response.raise_for_status()
            created_event = response.json()
            created_events.append(
                {
                    "task_id": task_id,
                    "event_id": created_event.get("id"),
                    "html_link": created_event.get("htmlLink"),
                }
            )
        except httpx.HTTPStatusError as error:
            response = error.response
            failure_payload = response.text[:500] if response is not None else ""
            event_failures.append(
                {
                    "task_id": task_id,
                    "status": response.status_code if response is not None else None,
                    "error": failure_payload or str(error),
                }
            )
        except Exception as error:
            event_failures.append(
                {
                    "task_id": task_id,
                    "status": None,
                    "error": str(error),
                }
            )

    if event_failures:
        first_failure = event_failures[0]
        status_hint = f" (status {first_failure.get('status')})" if first_failure.get("status") else ""
        return created_events, (
            "Some calendar events could not be created"
            f"{status_hint}. "
            "Reconnect Google Calendar to refresh permissions and token."
        ), event_failures

    return created_events, None, []


def _delete_google_calendar_events(
    calendar_event_ids,
    calendar_credentials,
    calendar_client,
):
    access_token = str(calendar_credentials.get("google_calendar_access_token") or "").strip()
    calendar_id = str(calendar_credentials.get("google_calendar_id") or "").strip() or "primary"

    if not access_token:
        return [], "Missing Google Calendar access token."

    event_ids = _extract_event_ids(calendar_event_ids)
    failures = []

    for event_id in event_ids:
        try:
            response = calendar_client.delete(
                f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id, safe='')}/events/{quote(event_id, safe='')}",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if response.status_code == 404:
                continue

            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            response = error.response
            if response is not None and response.status_code == 404:
                continue

            failures.append(
                {
                    "event_id": event_id,
                    "status": response.status_code if response is not None else None,
                    "error": response.text[:500] if response is not None else str(error),
                }
            )
        except Exception as error:
            failures.append(
                {
                    "event_id": event_id,
                    "status": None,
                    "error": str(error),
                }
            )

    if failures:
        first_failure = failures[0]
        status_hint = f" (status {first_failure.get('status')})" if first_failure.get("status") else ""
        return failures, f"Some calendar events could not be removed{status_hint}."

    return [], None


def _fetch_assignment_focus_window_rows(student_id):
    return (
        db.table("student_peak_focus_windows")
        .select("peak_theta, ci_low, ci_high")
        .eq("student_id", student_id)
        .order("peak_density", desc=True)
        .execute()
        .data
        or []
    )


def _create_assignment_focus_window_rows(student_id):
    windows = run_kde_for_student(student_id)
    if not windows:
        return []

    for window in windows:
        db.table("student_peak_focus_windows").insert(
            {
                "student_id": student_id,
                "peak_theta": window["peak_theta"],
                "ci_low": window["ci_low"],
                "ci_high": window["ci_high"],
                "peak_density": window["peak_density"],
            }
        ).execute()

    return _fetch_assignment_focus_window_rows(student_id)


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


@assignment_bp.route("/<assignment_id>/schedule", methods=["POST", "DELETE"])
def schedule_assignment(assignment_id):
    if request.method == "DELETE":
        assignment_result = db.table("assignments").select("*").eq("id", assignment_id).execute()
        assignment = assignment_result.data[0] if assignment_result.data else None
        if assignment is None:
            return {"error": "Assignment not found"}, 404

        course_result = db.table("courses").select("id, student_id, code").eq("id", assignment.get("course_id")).execute()
        course = course_result.data[0] if course_result.data else None
        if course is None:
            return {"error": "Course not found"}, 404

        student_result = db.table("students").select("id, google_calendar_id, google_calendar_access_token").eq("id", course.get("student_id")).execute()
        student = student_result.data[0] if student_result.data else None
        if student is None:
            return {"error": "Student not found"}, 404

        schedule_state = _get_assignment_schedule_state(assignment_id)
        if not schedule_state:
            return {
                "assignment_id": assignment_id,
                "schedule_status": "unscheduled",
                "calendar_event_ids": [],
                "message": "Assignment was not scheduled.",
            }, 200

        with httpx.Client(http2=False, timeout=30.0) as calendar_client:
            failures, warning = _delete_google_calendar_events(
                schedule_state.get("calendar_event_ids") or [],
                _student_calendar_credentials(student),
                calendar_client,
            )

        if failures:
            return {
                "error": warning or "Unable to remove calendar events.",
                "calendar_event_failures": failures,
            }, 502

        _clear_assignment_schedule_state(assignment_id)

        return {
            "assignment_id": assignment_id,
            "schedule_status": "unscheduled",
            "calendar_event_ids": [],
            "message": "Assignment unscheduled successfully.",
        }, 200

    assignment_result = db.table("assignments").select("*").eq("id", assignment_id).execute()
    assignment = assignment_result.data[0] if assignment_result.data else None
    if assignment is None:
        return {"error": "Assignment not found"}, 404

    course_result = db.table("courses").select("id, student_id, code").eq("id", assignment.get("course_id")).execute()
    course = course_result.data[0] if course_result.data else None
    if course is None:
        return {"error": "Course not found"}, 404

    student_result = db.table("students").select("id, google_calendar_id, google_calendar_access_token").eq("id", course.get("student_id")).execute()
    student = student_result.data[0] if student_result.data else None
    if student is None:
        return {"error": "Student not found"}, 404

    tasks = (
        db.table("tasks")
        .select("id, priority, task, xp, completed")
        .eq("assignment_id", assignment_id)
        .order("priority")
        .execute()
        .data
        or []
    )

    focus_window_rows = _fetch_assignment_focus_window_rows(student.get("id"))
    if not focus_window_rows:
        focus_window_rows = _create_assignment_focus_window_rows(student.get("id"))

    with httpx.Client(http2=False, timeout=30.0) as calendar_client:
        schedule_plan = build_schedule_plan(
            tasks,
            focus_window_rows,
            _student_calendar_credentials(student),
            calendar_client=calendar_client,
        )
        created_events, event_warning, event_failures = _create_google_calendar_events(
            schedule_plan=schedule_plan,
            tasks=tasks,
            assignment=assignment,
            course_code=course.get("code"),
            calendar_credentials=_student_calendar_credentials(student),
            calendar_client=calendar_client,
        )

    if event_failures:
        with httpx.Client(http2=False, timeout=30.0) as cleanup_client:
            cleanup_failures, cleanup_warning = _delete_google_calendar_events(
                created_events,
                _student_calendar_credentials(student),
                cleanup_client,
            )

        if cleanup_failures:
            event_failures.extend(cleanup_failures)

        return {
            "error": cleanup_warning or event_warning or "Some calendar events could not be created.",
            "calendar_warning": event_warning or cleanup_warning,
            "calendar_event_failures": event_failures,
        }, 502

    _save_assignment_schedule_state(assignment_id, created_events)

    if event_warning and not schedule_plan.get("calendar_warning"):
        schedule_plan["calendar_warning"] = event_warning
    elif event_warning and schedule_plan.get("calendar_warning"):
        schedule_plan["calendar_warning"] = f"{schedule_plan.get('calendar_warning')} {event_warning}"

    return {
        "assignment_id": assignment_id,
        "course_id": course.get("id"),
        "course_code": course.get("code"),
        "student_id": student.get("id"),
        "tasks": tasks,
        "created_events": created_events,
        "calendar_event_failures": event_failures,
        "schedule_status": "scheduled",
        **schedule_plan,
    }, 200


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

    assignments_with_schedule = []
    for assignment in assignments:
        schedule_state = _get_assignment_schedule_state(assignment.get("id"))
        schedule_status = schedule_state.get("schedule_status") if schedule_state else "unscheduled"
        scheduled_at = schedule_state.get("scheduled_at") if schedule_state else None
        calendar_event_ids = schedule_state.get("calendar_event_ids") if schedule_state else []

        assignments_with_schedule.append(
            {
                **assignment,
                "schedule_status": schedule_status,
                "scheduled_at": scheduled_at,
                "calendar_event_ids": calendar_event_ids or [],
                "scheduled": schedule_status == "scheduled",
            }
        )

    return {"assignments": assignments_with_schedule}, 200


@assignment_bp.route("/<student_id>/<course_code>/<assignment_id>", methods=["GET", "PUT", "DELETE"])
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

    if request.method == "GET":
        if tasks is None:
            return {"error": "Error fetching tasks"}, 500
        return {"tasks": tasks}, 200

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
