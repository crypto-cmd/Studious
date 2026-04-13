# Backend Route Map

This document maps the available backend API routes and explains what each route does.

Last verified against source: 2026-04-13

## Base URL Prefixes

- `/api/assignments`
- `/api/trajectory`
- `/api/course-grades`

## Routes

Total endpoints: 5

| Method | Full Route | Purpose |
|---|---|---|
| `POST` | `/api/assignments/<student_id>/<course_code>/create_assignment` | Creates an assignment task list from `instructions` (AI-chunked tasks), calculates task count and total XP, stores tasks in `assignments`, and returns task details. |
| `PATCH` | `/api/assignments/<student_id>/<course_code>/<assignment_id>/complete_task/<task_id>` | Marks one task as completed in an existing assignment after validating assignment ownership by student and course. |
| `POST` | `/api/trajectory/<student_id>/<course_code>/predict_final_grade` | Reads stored predicted grades for a course, predicts the final grade based on final exam month, saves `final_predicted_grade` in `courses`, and returns it. |
| `GET` | `/api/course-grades/<student_id>/<course_code>/predict` | Predicts a course grade from student + course-specific inputs and returns prediction data without saving it. |
| `POST` | `/api/course-grades/<student_id>/<course_code>/predict` | Predicts a course grade, appends it to `courses.predicted_grades` with current month, updates `current_predicted_grade`, and returns saved result. |

## Route Source Files

- `backend/main.py` (blueprint registration and prefixes)
- `backend/routes/assignment_routes.py`
- `backend/routes/trajectory_routes.py`
- `backend/routes/course_grade_routes.py`

## API Contracts

Notes:
- Path parameters are required for all routes.
- Response shapes below reflect current implementation behavior.
- Some database misses are not consistently handled and may surface as unhandled exceptions.

### 1) Create Assignment Tasks

- Method: `POST`
- Route: `/api/assignments/<student_id>/<course_code>/create_assignment`

Request body:

```json
{
	"instructions": "Read chapter 3 and prepare quiz notes"
}
```

Success response (`200`):

```json
{
	"tasks": [
		{
			"id": "task_1",
			"title": "Read chapter 3",
			"completed": false
		}
	],
	"task_count": 1,
	"total_xp": 50
}
```

Error responses:

`400` if instructions are missing:

```json
{
	"error": "Instructions parameter is required"
}
```

### 2) Complete One Assignment Task

- Method: `PATCH`
- Route: `/api/assignments/<student_id>/<course_code>/<assignment_id>/complete_task/<task_id>`

Request body:

- None required.

Success response (`200`):

```json
{
	"message": "Task marked as completed"
}
```

Error responses:

Expected `404` if assignment is not found:

```json
{
	"error": "Assignment not found"
}
```

Current behavior note:

- The implementation reads `data[0]` before checking emptiness, so a missing assignment may raise an unhandled exception instead of returning the expected `404` payload.

`403` if assignment does not belong to the provided student/course:

```json
{
	"error": "Assignment does not belong to the specified student or course"
}
```

### 3) Predict Final Course Grade Trajectory

- Method: `POST`
- Route: `/api/trajectory/<student_id>/<course_code>/predict_final_grade`

Request body:

- None required.

Success response (`200`):

```json
{
	"predicted_final_grade": 82
}
```

Potential runtime failure behavior:

- If expected DB fields are missing (for example no matching course row), current code may raise an unhandled exception instead of returning a structured error JSON.

### 4) Predict Course Grade (Read-Only)

- Method: `GET`
- Route: `/api/course-grades/<student_id>/<course_code>/predict`

Request body:

- None.

Success response (`200`):

```json
{
	"student_id": "123",
	"course_code": "MATH101",
	"model_input": {
		"age": 20,
		"gender": "male",
		"attendance_percentage": 91,
		"sleep_hours": 7,
		"exercise_frequency": 3,
		"mental_health_rating": 8,
		"study_hours_per_day": 4
	},
	"predicted_grade": 79
}
```

Error responses:

`404` if student/course input data is missing:

```json
{
	"error": "Student course data not found"
}
```

`400` if model input validation fails:

```json
{
	"error": "<validation message>"
}
```

`500` if predictor/model runtime fails:

```json
{
	"error": "<runtime message>"
}
```

### 5) Predict and Save Course Grade

- Method: `POST`
- Route: `/api/course-grades/<student_id>/<course_code>/predict`

Request body:

- None required.

Success response (`201`):

```json
{
	"student_id": "123",
	"course_code": "MATH101",
	"model_input": {
		"age": 20,
		"gender": "male",
		"attendance_percentage": 91,
		"sleep_hours": 7,
		"exercise_frequency": 3,
		"mental_health_rating": 8,
		"study_hours_per_day": 4
	},
	"predicted_grade": 79,
	"saved": true
}
```

Error responses:

`404` if student/course input data is missing:

```json
{
	"error": "Student course data not found"
}
```

`404` if course is not found while loading `predicted_grades`:

```json
{
	"error": "Course not found"
}
```

`400` if model input validation fails:

```json
{
	"error": "<validation message>"
}
```

`500` if predictor/model runtime fails:

```json
{
	"error": "<runtime message>"
}
```
