from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx


SLOT_DURATION_MINUTES = 30
WEEK_SECONDS = 7 * 24 * 60 * 60
TWO_PI = 6.283185307179586


def _parse_datetime(value: Any) -> datetime | None:
	if not isinstance(value, str) or not value.strip():
		return None

	try:
		parsed_value = datetime.fromisoformat(value.replace("Z", "+00:00"))
	except ValueError:
		return None

	if parsed_value.tzinfo is None:
		return parsed_value.replace(tzinfo=timezone.utc)

	return parsed_value.astimezone(timezone.utc)


def _current_week_anchor(reference: datetime | None = None) -> datetime:
	current = reference or datetime.now(timezone.utc)
	current = current.astimezone(timezone.utc)
	return current.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=current.weekday())


def _theta_to_offset(theta: float) -> timedelta:
	normalized_theta = theta % TWO_PI
	seconds = (normalized_theta / TWO_PI) * WEEK_SECONDS
	return timedelta(seconds=seconds)


def _merge_intervals(intervals: list[tuple[datetime, datetime]]) -> list[tuple[datetime, datetime]]:
	if not intervals:
		return []

	merged: list[tuple[datetime, datetime]] = []
	for start, end in sorted(intervals, key=lambda interval: interval[0]):
		if not merged or start > merged[-1][1]:
			merged.append((start, end))
			continue

		previous_start, previous_end = merged[-1]
		merged[-1] = (previous_start, max(previous_end, end))

	return merged


def _subtract_busy_blocks(
	focus_windows: list[tuple[datetime, datetime]],
	busy_blocks: list[tuple[datetime, datetime]],
) -> list[tuple[datetime, datetime]]:
	merged_busy = _merge_intervals(busy_blocks)
	free_blocks: list[tuple[datetime, datetime]] = []

	for focus_start, focus_end in focus_windows:
		cursor = focus_start

		for busy_start, busy_end in merged_busy:
			if busy_end <= cursor:
				continue
			if busy_start >= focus_end:
				break

			if busy_start > cursor:
				free_blocks.append((cursor, min(busy_start, focus_end)))

			cursor = max(cursor, busy_end)
			if cursor >= focus_end:
				break

		if cursor < focus_end:
			free_blocks.append((cursor, focus_end))

	minimum_block = timedelta(minutes=SLOT_DURATION_MINUTES)
	return [block for block in free_blocks if block[1] - block[0] >= minimum_block]


def project_focus_windows(window_rows: list[dict[str, Any]], reference: datetime | None = None) -> list[tuple[datetime, datetime]]:
	anchor = _current_week_anchor(reference)
	now = reference.astimezone(timezone.utc) if reference is not None else datetime.now(timezone.utc)
	projected: list[tuple[datetime, datetime]] = []

	for window in window_rows:
		peak_theta = float(window.get("peak_theta") or 0.0)
		ci_low = float(window.get("ci_low") if window.get("ci_low") is not None else peak_theta)
		ci_high = float(window.get("ci_high") if window.get("ci_high") is not None else peak_theta)

		low_offset = _theta_to_offset(ci_low)
		high_offset = _theta_to_offset(ci_high)
		peak_offset = _theta_to_offset(peak_theta)

		intervals: list[tuple[timedelta, timedelta]]
		if ci_high < ci_low:
			intervals = [
				(low_offset, timedelta(seconds=WEEK_SECONDS)),
				(timedelta(0), high_offset),
			]
		else:
			intervals = [(min(low_offset, peak_offset), max(high_offset, peak_offset))]

		for start_offset, end_offset in intervals:
			start = anchor + start_offset
			end = anchor + end_offset
			if end <= start:
				continue
			if end <= now:
				start = start + timedelta(days=7)
				end = end + timedelta(days=7)
			projected.append((start, end))

	return sorted(projected, key=lambda interval: interval[0])


def _fetch_google_busy_blocks(
	calendar_credentials: dict[str, Any],
	time_min: datetime,
	time_max: datetime,
	calendar_client: httpx.Client | None = None,
) -> list[tuple[datetime, datetime]]:
	access_token = str(calendar_credentials.get("google_calendar_access_token") or "").strip()
	calendar_id = str(calendar_credentials.get("google_calendar_id") or "").strip() or "primary"

	if not access_token:
		return []

	client = calendar_client or httpx.Client(http2=False, timeout=30.0)
	should_close_client = calendar_client is None

	try:
		response = client.post(
			"https://www.googleapis.com/calendar/v3/freeBusy",
			headers={"Authorization": f"Bearer {access_token}"},
			json={
				"timeMin": time_min.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
				"timeMax": time_max.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
				"items": [{"id": calendar_id}],
			},
		)
		response.raise_for_status()

		calendars = response.json().get("calendars", {}) or {}
		busy_blocks: list[tuple[datetime, datetime]] = []

		for calendar_data in calendars.values():
			for busy_block in calendar_data.get("busy", []) or []:
				busy_start = _parse_datetime(busy_block.get("start"))
				busy_end = _parse_datetime(busy_block.get("end"))
				if busy_start is None or busy_end is None:
					continue
				busy_blocks.append((busy_start, busy_end))

		return busy_blocks
	except Exception:
		return []
	finally:
		if should_close_client:
			client.close()


def build_schedule_plan(
	tasks: list[dict[str, Any]],
	focus_window_rows: list[dict[str, Any]],
	calendar_credentials: dict[str, Any],
	calendar_client: httpx.Client | None = None,
) -> dict[str, Any]:
	ordered_tasks = sorted(tasks, key=lambda task: int(task.get("priority") or 0))
	focus_windows = project_focus_windows(focus_window_rows)

	if not ordered_tasks:
		return {"free_blocks": [], "scheduled_tasks": [], "unassigned_tasks": []}

	if not focus_windows:
		return {
			"free_blocks": [],
			"scheduled_tasks": [],
			"unassigned_tasks": [task.get("id") for task in ordered_tasks],
			"calendar_warning": "No focus windows were available.",
		}

	busy_blocks = _fetch_google_busy_blocks(
		calendar_credentials=calendar_credentials,
		time_min=min(window[0] for window in focus_windows),
		time_max=max(window[1] for window in focus_windows),
		calendar_client=calendar_client,
	)
	free_blocks = _subtract_busy_blocks(focus_windows, busy_blocks)

	remaining_blocks = free_blocks[:]
	scheduled_tasks: list[dict[str, Any]] = []
	unassigned_tasks: list[Any] = []
	task_duration = timedelta(minutes=SLOT_DURATION_MINUTES)

	for task in ordered_tasks:
		scheduled = False

		for index, (block_start, block_end) in enumerate(remaining_blocks):
			if block_end - block_start < task_duration:
				continue

			scheduled_start = block_start
			scheduled_end = block_start + task_duration
			scheduled_tasks.append(
				{
					"task_id": task.get("id"),
					"priority": int(task.get("priority") or 0),
					"start": scheduled_start.isoformat(),
					"end": scheduled_end.isoformat(),
				}
			)

			next_blocks = remaining_blocks[:index]
			if scheduled_end < block_end:
				next_blocks.append((scheduled_end, block_end))
			next_blocks.extend(remaining_blocks[index + 1 :])
			remaining_blocks = next_blocks
			scheduled = True
			break

		if not scheduled:
			unassigned_tasks.append(task.get("id"))

	return {
		"free_blocks": [{"start": start.isoformat(), "end": end.isoformat()} for start, end in free_blocks],
		"scheduled_tasks": scheduled_tasks,
		"unassigned_tasks": unassigned_tasks,
	}
