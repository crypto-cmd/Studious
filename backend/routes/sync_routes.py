import datetime
from datetime import datetime as dt, timezone

from flask import Blueprint

from data.db import db
from routines.focus_kde import run_kde_for_student

sync_bp = Blueprint("sync_bp", __name__)


def mark_sync_stale(student_id):
    existing = db.table("syncs").select("*").eq("student_id", student_id).execute()
    if existing.data:
        db.table("syncs").update({"last_synced_at": None}).eq("student_id", student_id).execute()
    else:
        db.table("syncs").insert({"student_id": student_id, "last_synced_at": None}).execute()


def _compute_final_predicted_grade(student_id, course_code):
    course_result = (
        db.table("courses")
        .select("predicted_grades, final_exam_date, current_predicted_grade")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )
    if not course_result.data:
        return

    course_row = course_result.data[0]
    predicted_grades = course_row.get("predicted_grades", [])
    final_date = course_row.get("final_exam_date")

    if not final_date:
        return

    months = {e.get("month") for e in predicted_grades if e.get("month") is not None}
    if len(months) >= 2:
        from computations.TrajectoryPredictor import TrajectoryPredictor
        trajectory_predictor = TrajectoryPredictor(predicted_grades)
        final_month = datetime.datetime.strptime(final_date, "%Y-%m-%d").month
        predicted_final_grade = trajectory_predictor.predict_final_grade(final_month)
    else:
        predicted_final_grade = course_row.get("current_predicted_grade")
        if predicted_final_grade is None:
            return

    db.table("courses").update({"final_predicted_grade": predicted_final_grade}).eq("student_id", student_id).eq("code", course_code).execute()


@sync_bp.route("/<student_id>/status", methods=["GET"])
def check_sync_status(student_id):
    try:
        result = db.rpc("check_sync_status", {"p_student_id": student_id}).execute()
        is_stale = bool(result.data) if result.data is not None else True
        return {"student_id": student_id, "stale": is_stale}, 200
    except Exception as exc:
        return {"error": f"Unable to check sync status: {exc}"}, 500


@sync_bp.route("/<student_id>/run", methods=["POST"])
def run_sync(student_id):
    errors = []

    courses_result = db.table("courses").select("code").eq("student_id", student_id).execute()
    courses = courses_result.data or []

    for course in courses:
        course_code = course.get("code", "")
        if not course_code:
            continue

        try:
            student_data = _get_student_grade_input(student_id, course_code)
            if student_data is None:
                errors.append({"course": course_code, "error": "Missing grade input data"})
                continue

            from computations.GradePredictor import GradePredictor
            predicted_grade = GradePredictor().predict_grade(student_data)

            existing = (
                db.table("courses")
                .select("predicted_grades")
                .eq("student_id", student_id)
                .eq("code", course_code)
                .execute()
            )
            if existing.data:
                course_row = existing.data[0]
                predicted_grades = course_row.get("predicted_grades", [])
                current_month = dt.now().month
                existing_idx = None
                for i, entry in enumerate(predicted_grades):
                    if entry.get("month") == current_month:
                        existing_idx = i
                        break
                new_entry = {"grade": predicted_grade, "month": current_month}
                if existing_idx is not None:
                    predicted_grades[existing_idx] = new_entry
                else:
                    predicted_grades.append(new_entry)
                db.table("courses").update({
                    "predicted_grades": predicted_grades,
                    "current_predicted_grade": predicted_grade,
                }).eq("student_id", student_id).eq("code", course_code).execute()

            _compute_final_predicted_grade(student_id, course_code)

        except Exception as exc:
            errors.append({"course": course_code, "error": str(exc)})

    try:
        peaks_result = db.table("student_peak_focus_windows").select("*").eq("student_id", student_id).execute()
        if peaks_result.data:
            db.table("student_peak_focus_windows").delete().eq("student_id", student_id).execute()

        windows = run_kde_for_student(student_id)
        for window in windows:
            db.table("student_peak_focus_windows").insert({
                "student_id": student_id,
                "peak_theta": window["peak_theta"],
                "ci_low": window["ci_low"],
                "ci_high": window["ci_high"],
                "peak_density": window["peak_density"],
            }).execute()
    except Exception as exc:
        errors.append({"routine": "focus_windows", "error": str(exc)})

    try:
        sessions_result = (
            db.table("focus_sessions")
            .select("session_start, session_end")
            .eq("student_id", student_id)
            .execute()
        )
        sessions = sessions_result.data or []
        if sessions:
            total_seconds = 0
            distinct_dates = set()
            for s in sessions:
                start = datetime.datetime.fromisoformat(s["session_start"])
                end = datetime.datetime.fromisoformat(s["session_end"])
                total_seconds += max(0, (end - start).total_seconds())
                distinct_dates.add(start.date())

            total_hours = total_seconds / 3600
            study_days = max(len(distinct_dates), 1)

            calculated = round(total_hours / study_days, 2)
        else:
            calculated = 0.0

        db.table("student_study_data").update({
            "calculated_study_hours_per_day": calculated,
        }).eq("student_id", student_id).execute()
    except Exception as exc:
        errors.append({"routine": "calculated_study_hours", "error": str(exc)})

    now_iso = dt.now(timezone.utc).isoformat()
    db.table("syncs").update({"last_synced_at": now_iso}).eq("student_id", student_id).execute()

    return {
        "student_id": student_id,
        "completed_at": now_iso,
        "errors": errors,
    }, 200 if not errors else 207


_GRADE_INPUT_FIELDS = [
    "age",
    "gender",
    "attendance_percentage",
    "sleep_hours_per_night",
    "exercise_hours_per_week",
    "mental_health_rating",
    "study_hours_per_day",
]


def _get_student_grade_input(student_id, course_code):
    prelim_data = db.table("students").select("age, gender").eq("id", student_id).execute()
    course_data = (
        db.table("courses")
        .select("attendance_percentage")
        .eq("student_id", student_id)
        .eq("code", course_code)
        .execute()
    )
    special_data = (
        db.table("student_study_data")
        .select("sleep_hours_per_night, exercise_hours_per_week, mental_health_rating, study_hours_per_day, calculated_study_hours_per_day, use_calculated_study_hours")
        .eq("student_id", student_id)
        .execute()
    )

    if not prelim_data.data or not course_data.data or not special_data.data:
        return None

    student_row = {**prelim_data.data[0], **course_data.data[0], **special_data.data[0]}
    effective_study_hours = student_row.get("study_hours_per_day")
    if student_row.get("use_calculated_study_hours") and student_row.get("calculated_study_hours_per_day") is not None:
        effective_study_hours = student_row.get("calculated_study_hours_per_day")

    student_row["study_hours_per_day"] = effective_study_hours
    return {field: student_row.get(field) for field in _GRADE_INPUT_FIELDS}
