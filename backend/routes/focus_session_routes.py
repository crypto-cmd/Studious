from flask import Blueprint, request
from datetime import datetime
import os
from supabase import create_client

from data.db import db

focus_session_bp = Blueprint("focus_session_bp", __name__)


def _parse_time_to_seconds(value):
    try:
        parsed_time = datetime.strptime(value, "%H:%M:%S").time()
    except ValueError:
        return None

    return parsed_time.hour * 3600 + parsed_time.minute * 60 + parsed_time.second

@focus_session_bp.route("/<student_id>", methods=["GET"])
def list_focus_sessions(student_id):
    try:
        response = (db.table("focus_sessions")
                .select("id, student_id, day_of_week, start_time, end_time, created_at")
                .eq("student_id", student_id)
                .limit(10)
                .execute())
       
        return {"sessions": response.data or []}, 200
    except Exception:
        return {"error": "Unable to load focus sessions"}, 500


@focus_session_bp.route("/<student_id>", methods=["POST"])
def create_focus_session(student_id):
    payload = request.get_json(silent=True) or {}
    day_of_week = str(payload.get("day_of_week") or "").strip()
    start_time = str(payload.get("start_time") or "").strip()
    end_time = str(payload.get("end_time") or "").strip()

    if not day_of_week or not start_time or not end_time:
        return {"error": "day_of_week, start_time, and end_time are required"}, 400

    start_seconds = _parse_time_to_seconds(start_time)
    end_seconds = _parse_time_to_seconds(end_time)

    if start_seconds is None or end_seconds is None:
        return {"error": "start_time and end_time must use HH:MM:SS format"}, 400

    if end_seconds <= start_seconds:
        return {"error": "end_time must be after start_time"}, 400

    try:
        response = (
            db.table("focus_sessions")
            .insert(
                {
                    "student_id": student_id,
                    "day_of_week": day_of_week,
                    "start_time": start_time,
                    "end_time": end_time,
                }
            )
            .execute()
        )

        if not response.data:
            return {"error": "Unable to create focus session"}, 500

        return response.data[0], 201
    except Exception:
        return {"error": "Unable to create focus session"}, 500
