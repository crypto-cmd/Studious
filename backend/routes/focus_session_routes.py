from datetime import datetime
import math
from flask import Blueprint, request
from data.db import db
from routines.focus_kde import run_kde_for_student, format_peak_windows
from routes.sync_routes import mark_sync_stale
focus_session_bp = Blueprint("focus_session_bp", __name__)


def _theta_from_datetime(value):
    seconds_per_day = 24 * 60 * 60
    seconds_per_week = seconds_per_day * 7

    day_offset = value.weekday() * seconds_per_day
    time_offset = (
        value.hour * 3600
        + value.minute * 60
        + value.second
        + value.microsecond / 1_000_000
    )

    return (2 * math.pi * (day_offset + time_offset)) / seconds_per_week


def _parse_iso_datetime(value):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        return None


@focus_session_bp.route("/<student_id>", methods=["GET"])
def list_focus_sessions(student_id):
    try:
        response = (
            db.table("focus_sessions")
            .select("*")
            .eq("student_id", student_id)
            .order("session_start", desc=True)
            .limit(10)
            .execute()
        )
        return {"sessions": response.data or []}, 200
    except Exception:
        return {"error": "Unable to load focus sessions"}, 500


@focus_session_bp.route("/<student_id>", methods=["POST"])
def create_focus_session(student_id):
    payload = request.get_json(silent=True) or {}
    session_start_raw = str(payload.get("session_start") or "").strip()
    session_end_raw = str(payload.get("session_end") or "").strip()

    try:
        focus_score = int(payload.get("focus_score", 0))
        productivity_score = int(payload.get("productivity_score", 0))
    except (TypeError, ValueError):
        return {"error": "focus_score and productivity_score must be integers"}, 400

    if not session_start_raw or not session_end_raw:
        return {"error": "session_start and session_end are required"}, 400

    session_start = _parse_iso_datetime(session_start_raw)
    session_end = _parse_iso_datetime(session_end_raw)

    if session_start is None or session_end is None:
        return {"error": "session_start and session_end must use ISO-8601 datetime format"}, 400

    if session_end <= session_start:
        return {"error": "session_end must be after session_start"}, 400

    if focus_score < 1 or focus_score > 5:
        return {"error": "focus_score must be between 1 and 5"}, 400

    if productivity_score < 1 or productivity_score > 3:
        return {"error": "productivity_score must be between 1 and 3"}, 400

    # Calculate theta values on a weekly circular scale so KDE can compare sessions by time-of-week.
    theta_start = _theta_from_datetime(session_start)
    theta_end = _theta_from_datetime(session_end)

    # Calculate quality score based on focus_score and productivity_score and the mental health of the student (for simplicity, we'll just average them here, but this could be a more complex calculation)
    mental_health_rating = db.table("student_study_data").select("mental_health_rating").eq("student_id", student_id).single().execute().data
    mental_health_rating = mental_health_rating["mental_health_rating"] if mental_health_rating else 5  # Default to neutral mental health if not found

    quality_score = ((focus_score - 1) / 4.0 + (productivity_score - 1) / 2.0 + (mental_health_rating - 1) / 4.0) / 3.0

    print(f"Calculating quality score: {quality_score}")
    data = {
        "student_id": student_id,
        "session_start": session_start.isoformat(),
        "session_end": session_end.isoformat(),

        "theta_start": float(theta_start),
        "theta_end": float(theta_end),

        "focus_score": focus_score,
        "productivity_score": productivity_score,
        "mental_health_rating": mental_health_rating,
        "quality_score": quality_score,
    }
    print (f"Creating focus session with data: {data}")
    try:
        response = (
            db.table("focus_sessions").insert(data).execute()
        )

        if not response.data:
            return {"error": "Unable to create focus session",
                    "data": data}, 500

        mark_sync_stale(student_id)
        return response.data[0], 201
    except Exception:
        return {"error": "Unable to create focus session"}, 500

@focus_session_bp.route("/<student_id>/peaks", methods=["GET"])
def get_peak_focus_windows(student_id):
    # Wipe existing peak windows for the student (we'll recalculate them fresh each time based on all sessions - this is simpler than trying to do incremental updates as new sessions come in, and KDE is fast enough that this should be fine for our expected load)
    db.table("student_peak_focus_windows").delete().eq("student_id", student_id).execute()

    # Run the KDE routine to get the latest peak windows based on all of the student's sessions
    windows = run_kde_for_student(student_id)
    try:
        for window in windows:
            db.table("student_peak_focus_windows").insert({
                "student_id": student_id,
                "peak_theta": window['peak_theta'],
                "ci_low": window['ci_low'],
                "ci_high": window['ci_high'],
                "peak_density": window['peak_density'],
            }).execute()
        return {"message": "Peak focus windows calculated and stored successfully", "windows": windows}, 200
    except Exception:
        return {"error": "Unable to load focus sessions"}, 500