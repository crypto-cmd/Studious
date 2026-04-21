CREATE TABLE
    IF NOT EXISTS students (
        -- Generating UUIDs for student IDs to ensure uniqueness across institutions
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        student_number TEXT NOT NULL, -- Unique student number assigned by the institution (e.g., "S12345678")
        auth_id UUID UNIQUE REFERENCES auth.users ON DELETE CASCADE, -- Reference to the authentication system's user ID
        name TEXT NOT NULL,
        age INT NOT NULL,
        gender TEXT NOT NULL,
        nickname TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW () -- Timestamp for when the student record was created
    );

-- Create a table to track the synchronization status of each student's data so when they log in, we can check if their data is stale and needs to be re-synced / recalculated. This will help ensure that students always see up-to-date information without having to wait for a sync on every login.
CREATE TABLE
    IF NOT EXISTS syncs (
        student_id UUID REFERENCES students (id) ON DELETE CASCADE, -- Reference to the student, with cascade delete to remove syncs if the student is deleted
        checked_at TIMESTAMPTZ DEFAULT NOW (), -- Timestamp for when the sync was checked
        last_synced_at TIMESTAMPTZ, -- Timestamp for when the sync was last successful
        stale BOOLEAN DEFAULT TRUE, -- Whether the data is stale and needs to be re-synced
        PRIMARY KEY (student_id)
    );

create view public.syncs_view with (security_invoker = on) as
 SELECT student_id,
    checked_at,
    last_synced_at,
    last_synced_at IS NULL OR last_synced_at < (checked_at - '7 days'::interval) AS stale
   FROM syncs;

CREATE TABLE
    IF NOT EXISTS courses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
        code TEXT NOT NULL,
        student_id UUID REFERENCES students (id) ON DELETE CASCADE, -- Reference to the student, with cascade delete to remove courses if the student is deleted
        title TEXT NOT NULL,
        current_predicted_grade FLOAT,
        final_predicted_grade FLOAT,
        final_exam_date DATE NOT NULL,
        attendance_percentage FLOAT DEFAULT 95, -- Track attendance percentage for the course (for analytics purposes)
        predicted_grades JSONB DEFAULT '[]'::jsonb, -- Array of predicted grades as { "month": "9", "grade": 85 }
        UNIQUE (code, student_id) -- Ensure a student can't have duplicate course codes
    );

CREATE TABLE
    IF NOT EXISTS assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
        course_id uuid REFERENCES courses (id) ON DELETE CASCADE, -- Reference to the course, with cascade delete to remove assignments if the course is deleted
        title TEXT NOT NULL,
        instructions TEXT,
        due_date TIMESTAMPTZ
    );

CREATE TABLE
    IF NOT EXISTS course_materials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
        student_id UUID REFERENCES students (id) ON DELETE CASCADE,
        course_id uuid REFERENCES courses (id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW ()
    );

CREATE TABLE
    IF NOT EXISTS tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
        assignment_id uuid REFERENCES assignments (id) ON DELETE CASCADE, -- Reference to the assignment, with cascade delete to remove tasks if the assignment is deleted
        priority INT NOT NULL, -- The order of the task within the assignment (0 - first)
        xp INT NOT NULL,
        task TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE
    );

-- Create table for storing study data related to students (for analytics purposes)
CREATE TABLE
    IF NOT EXISTS student_study_data (
        student_id UUID REFERENCES students (id) ON DELETE CASCADE,
        study_hours_per_day FLOAT NOT NULL,
        calculated_study_hours_per_day FLOAT, -- This will be calculated based on the focus sessions
        use_calculated_study_hours BOOLEAN DEFAULT FALSE, -- Whether to use the calculated study hours (from focus sessions) instead of the self-reported study hours
        
        sleep_hours_per_night FLOAT NOT NULL,
        exercise_hours_per_week FLOAT NOT NULL,
        mental_health_rating INT NOT NULL CHECK (
            mental_health_rating >= 1
            AND mental_health_rating <= 10
        ), -- A rating from 1 to 10 representing the student's mental health status
        PRIMARY KEY (student_id)
    );

-- Keep track of focus sessions for students in their courses, including feedback and ratings (for analytics purposes)
CREATE TABLE
    IF NOT EXISTS focus_sessions (
        id uuid NOT NULL DEFAULT gen_random_uuid (),
        student_id UUID REFERENCES students (id) ON DELETE CASCADE,
        -- Timestamp for when the focus session started and ended 
        session_start TIMESTAMPTZ NOT NULL,
        session_end TIMESTAMPTZ NOT NULL,
        -- Theta for the focus session as [0, 2pi] representing the time of day in a week on a circular scale
        -- Stored at write time to avoid expensive calculations at read time
        theta_start FLOAT CHECK (
            theta_start >= 0
            AND theta_start < 6.28318530718
        ) NOT NULL, -- 2 * PI
        theta_end FLOAT CHECK (
            theta_end >= 0
            AND theta_end < 6.28318530718
        ) NOT NULL,
        -- Quality rating for the focus session (for analytics purposes)
        -- A score from 1 to 5 representing the quality of the focus session, as rated by the student
        focus_score INT CHECK (
            focus_score >= 1
            AND focus_score <= 5
        ) NOT NULL,
        -- Final score
        -- A calculated score [0, 1] representing the quality of the focus session
        quality_score FLOAT CHECK (
            quality_score >= 0
            AND quality_score <= 1
        ) NOT NULL,
        PRIMARY KEY (id)
    );

-- Create table for storing peak focus times for students based on their focus sessions (for analytics purposes)
CREATE TABLE
    IF NOT EXISTS student_peak_focus_windows (
        id uuid NOT NULL DEFAULT gen_random_uuid (),
        student_id UUID REFERENCES students (id) ON DELETE CASCADE,
        peak_theta FLOAT NOT NULL, -- The theta representing the peak focus time for the student, calculated from their focus sessions
        -- Confidence interval (the window)
        ci_low FLOAT NOT NULL, -- The lower bound of the confidence interval for the peak focus time
        ci_high FLOAT NOT NULL, -- The upper bound of the confidence interval for the peak focus time
        -- peak density (the strength of the peak focus time)
        peak_density FLOAT CHECK (
            peak_density >= 0
            AND peak_density <= 1
        ) NOT NULL, -- A measure of how strong the peak focus time is for the student [0, 1], calculated from the density of their focus sessions around the peak theta
        PRIMARY KEY (id)
    );

    -- ==========================================
-- FOREIGN KEY INDEXES
-- (Essential for JOINs and ON DELETE CASCADE)
-- ==========================================

-- Courses referencing Students
CREATE INDEX IF NOT EXISTS idx_courses_student_id 
ON courses (student_id);

-- Assignments referencing Courses
CREATE INDEX IF NOT EXISTS idx_assignments_course_id 
ON assignments (course_id);

-- Tasks referencing Assignments
CREATE INDEX IF NOT EXISTS idx_tasks_assignment_id 
ON tasks (assignment_id);

-- Focus Sessions referencing Students
CREATE INDEX IF NOT EXISTS idx_focus_sessions_student_id 
ON focus_sessions (student_id);

-- Peak Focus Windows referencing Students
CREATE INDEX IF NOT EXISTS idx_student_peak_focus_windows_student_id 
ON student_peak_focus_windows (student_id);

-- Note: 'syncs' and 'student_study_data' use 'student_id' as their PRIMARY KEY, 
-- so they already have an implicit unique index on that column.


-- ==========================================
-- LOOKUP & FILTERING INDEXES
-- (Optimize common query patterns)
-- ==========================================

-- Useful for calculating the view (stale data check) efficiently
CREATE INDEX IF NOT EXISTS idx_syncs_timestamps 
ON syncs (checked_at, last_synced_at);

-- Frequently used to query upcoming or past-due assignments
CREATE INDEX IF NOT EXISTS idx_assignments_due_date 
ON assignments (due_date);

-- Frequently used to filter out completed tasks vs pending tasks
CREATE INDEX IF NOT EXISTS idx_tasks_completed 
ON tasks (completed);

-- Essential for querying a student's focus sessions over a specific time range (e.g., "this week")
CREATE INDEX IF NOT EXISTS idx_focus_sessions_session_start 
ON focus_sessions (session_start);