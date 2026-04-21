from datetime import datetime

from flask import Blueprint, request

from data.db import db

focus_session_bp = Blueprint("focus_session_bp", __name__)


def _parse_time_to_seconds(value):
    try:
        parsed_time = datetime.strptime(value, "%H:%M:%S").time()
    except ValueError:
        return None

    return parsed_time.hour * 3600 + parsed_time.minute * 60 + parsed_time.second


def _parse_iso_datetime(value):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        return None


def _clamp_focus_score(value):
    try:
        score = int(value)
    except (TypeError, ValueError):
        return None

    if score < 1 or score > 5:
        return None

    return score


@focus_session_bp.route("/<student_id>", methods=["GET"])
def list_focus_sessions(student_id):
    try:
        response = (
            db.table("focus_sessions")
            .select("*")
            .eq("student_id", student_id)
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
    theta_start = payload.get("theta_start")
    theta_end = payload.get("theta_end")
    focus_score = _clamp_focus_score(payload.get("focus_score"))
    quality_score = payload.get("quality_score")

    if not session_start_raw or not session_end_raw:
        return {"error": "session_start and session_end are required"}, 400

    session_start = _parse_iso_datetime(session_start_raw)
    session_end = _parse_iso_datetime(session_end_raw)

    if session_start is None or session_end is None:
        return {"error": "session_start and session_end must use ISO-8601 datetime format"}, 400

    if session_end <= session_start:
        return {"error": "session_end must be after session_start"}, 400

    if theta_start is None or theta_end is None:
        return {"error": "theta_start and theta_end are required"}, 400

    if focus_score is None:
        return {"error": "focus_score must be an integer between 1 and 5"}, 400

    if quality_score is None:
        quality_score = round(focus_score / 5, 2)
    else:
        try:
            quality_score = float(quality_score)
        except (TypeError, ValueError):
            return {"error": "quality_score must be a number"}, 400

    if quality_score < 0 or quality_score > 1:
        return {"error": "quality_score must be between 0 and 1"}, 400

    try:
        response = (
            db.table("focus_sessions")
            .insert(
                {
                    "student_id": student_id,
                    "session_start": session_start.isoformat(),
                    "session_end": session_end.isoformat(),
                    "theta_start": float(theta_start),
                    "theta_end": float(theta_end),
                    "focus_score": focus_score,
                    "quality_score": quality_score,
                }
            )
            .execute()
        )

        if not response.data:
            return {"error": "Unable to create focus session"}, 500

        return response.data[0], 201
    except Exception:
        return {"error": "Unable to create focus session"}, 500
