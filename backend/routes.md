# API Reference

This document describes the backend API routes and can be served by the Flask app at `/routes.md`.

## Route Prefixes

- `/api/assignments`
- `/api/trajectory`
- `/api/course-grades`
- `/api/improvement`
- `/api/auth`
- `/api/students`
- `/api/focus-sessions`

## Assignment Routes

### `/<student_id>/<course_code>/create_assignment, methods=[POST]`

**Description:** Create assignment tasks from instructions.

---
tags:
  - Assignments
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
  - in: body
    name: body
    required: true
    schema:
      type: object
      required:
        - instructions
      properties:
        title:
          type: string
        instructions:
          type: string
        due_date:
          type: string
responses:
  200:
    description: Assignment created and chunked into tasks.
  400:
    description: Missing instructions.

### `/<student_id>/<course_code>/<assignment_id>/complete_task/<task_id>, methods=[PATCH]`

**Description:** Mark an assignment task as completed.

---
tags:
  - Assignments
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
  - in: path
    name: assignment_id
    required: true
    schema:
      type: string
  - in: path
    name: task_id
    required: true
    schema:
      type: string
responses:
  200:
    description: Task marked as completed.
  403:
    description: Assignment does not belong to student or course.
  404:
    description: Assignment not found.

### `/<student_id>/<course_code>/assignments, methods=[GET]`

**Description:** List assignments for a student and course.

---
tags:
  - Assignments
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
responses:
  200:
    description: Assignments retrieved successfully.

### `/<student_id>/<course_code>/<assignment_id>, methods=[GET]`

**Description:** Get all tasks for a specific assignment.

---
tags:
  - Assignments
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
  - in: path
    name: assignment_id
    required: true
    schema:
      type: string
responses:
  200:
    description: Tasks retrieved successfully.
  403:
    description: Assignment does not belong to student or course.
  404:
    description: Assignment not found.


## Auth Routes

### `/student-profile, methods=[POST]`

**Description:** Create a student profile during auth onboarding.

---
tags:
  - Auth
parameters:
  - in: body
    name: body
    required: true
    schema:
      type: object
      required:
        - auth_id
        - firstname
        - lastname
        - nickname
        - student_id
        - gender
      properties:
        auth_id:
          type: string
        firstname:
          type: string
        lastname:
          type: string
        nickname:
          type: string
        student_id:
          type: string
        gender:
          type: string
          enum: [male, female, other]
        age:
          type: number
        onboarding:
          type: object
          properties:
            sleep_hours_per_night:
              type: number
            exercise_hours_per_week:
              type: number
            mental_health_rating:
              type: number
responses:
  201:
    description: Student profile created.
  400:
    description: Missing or invalid required fields.
  409:
    description: Profile already exists.
  500:
    description: Unable to create profile.

### `/student-profile/<auth_id>, methods=[GET]`

**Description:** Get a student profile by auth id.

---
tags:
  - Auth
parameters:
  - in: path
    name: auth_id
    required: true
    schema:
      type: string
responses:
  200:
    description: Student profile retrieved.
  404:
    description: Student not found.

### `/student-profile/<auth_id>, methods=[PATCH]`

**Description:** Update a student profile by auth id.

---
tags:
  - Auth
parameters:
  - in: path
    name: auth_id
    required: true
    schema:
      type: string
  - in: body
    name: body
    required: true
    schema:
      type: object
      properties:
        firstname:
          type: string
        lastname:
          type: string
        nickname:
          type: string
responses:
  200:
    description: Student profile updated.
  400:
    description: Missing required fields.
  404:
    description: Student not found.
  500:
    description: Unable to update profile.


## Course Grade Routes

### `/<student_id>/<course_code>/predict, methods=[GET]`

**Description:** Predict current grade for a course without saving.

---
tags:
  - Course Grades
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
responses:
  200:
    description: Grade predicted successfully.
  400:
    description: Invalid input for prediction model.
  404:
    description: Student course data not found.
  500:
    description: Prediction runtime error.

### `/<student_id>/<course_code>/predict, methods=[POST]`

**Description:** Predict current grade for a course and persist it.

---
tags:
  - Course Grades
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
responses:
  201:
    description: Grade predicted and saved.
  400:
    description: Invalid input for prediction model.
  404:
    description: Student data or course not found.
  500:
    description: Prediction runtime error.


## Focus Session Routes

### `/<student_id>, methods=[GET]`

**Description:** List recent focus sessions for a student.

---
tags:
  - Focus Sessions
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
responses:
  200:
    description: Sessions retrieved successfully.
  500:
    description: Unable to load focus sessions.

### `/<student_id>, methods=[POST]`

**Description:** Create a focus session for a student.

---
tags:
  - Focus Sessions
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: body
    name: body
    required: true
    schema:
      type: object
      required:
        - day_of_week
        - start_time
        - end_time
      properties:
        day_of_week:
          type: string
        start_time:
          type: string
          example: "09:00:00"
        end_time:
          type: string
          example: "10:30:00"
responses:
  201:
    description: Session created.
  400:
    description: Invalid payload or time range.
  500:
    description: Unable to create focus session.


## Improvement Routes

### `/<student_id>/<course_code>/improve, methods=[GET]`

**Description:** Generate grade improvement recommendations.

---
tags:
  - Improvement
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
responses:
  200:
    description: Improvement plan generated.
  404:
    description: Student course data not found.


## Student Routes

### `/<student_id>, methods=[GET]`

**Description:** Get a student profile by student id.

---
tags:
  - Students
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
responses:
  200:
    description: Student profile retrieved.
  404:
    description: Student not found.

### `/<student_id>, methods=[PATCH]`

**Description:** Update a student profile by student id.

---
tags:
  - Students
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: body
    name: body
    required: true
    schema:
      type: object
      properties:
        firstname:
          type: string
        lastname:
          type: string
        nickname:
          type: string
responses:
  200:
    description: Student profile updated.
  400:
    description: Missing required fields.
  404:
    description: Student not found.
  500:
    description: Unable to update profile.

### `/<student_id>/courses, methods=[GET]`

**Description:** List courses for a student.

---
tags:
  - Students
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
responses:
  200:
    description: Courses retrieved.


## Trajectory Routes

### `/<student_id>/<course_code>/predict_final_grade, methods=[POST]`

**Description:** Predict and save final grade trajectory for a course.

---
tags:
  - Trajectory
parameters:
  - in: path
    name: student_id
    required: true
    schema:
      type: string
  - in: path
    name: course_code
    required: true
    schema:
      type: string
responses:
  200:
    description: Final predicted grade generated and saved.
  404:
    description: Course or predicted grades not found.

