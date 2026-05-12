# Studious — Demo Walkthrough

> **Date:** May 12, 2026
> **Student:** `9491b299-0ee0-46ff-8d7e-78bddaf8808d`
> **Courses:** COMP2171 (Data Structures & Algorithms), ELET3460 (Embedded Systems)

---

## Before the Demo

### 1. Seed mock data
```bash
# Run against your Supabase database
psql "$SUPABASE_DB_URL" -f backend/data/schema/demo.sql
```

### 2. Trigger backend computations
```bash
python backend/seed_and_compute.py
```
This recalculates KDE peak focus windows, runs the full sync (grade predictions, study hours), and predicts grades per course.

### 3. Ensure services are running
- Backend Flask server (default `http://127.0.0.1:5000`)
- Frontend Next.js dev server
- Groq API key, Pinecone index, TF model all configured

---

## Demo Flow (~15–20 min)

### 1. Sign In
- Land on the login screen
- Click **"Sign in with Google"** → OAuth flow
- App loads the **Home Dashboard** with student name and ID
- *Mention: New users go through a 2-step onboarding (identity + study habits)*

### 2. Home Dashboard — Courses & Calendar
- **Course cards** show COMP2171 (grade 78 → 82) and ELET3460 (grade 65 → 70) with trend arrows
- **WeekStrip** at top: red dots for assignments, amber dots for exams on each day
- Click a date → **modal** lists due assignments and exams
- Click an assignment in the modal → navigates to Tasks with it preselected
- Click **"Add Course"** → shows the form (code, title, exam date, attendance, PDF upload)
- Upload a PDF → stored in Pinecone vector store for RAG context

### 3. Task Manager — AI Decomposition
- Switch to **Tasks** tab
- Select COMP2171 from the course dropdown
- Paste an instruction, e.g:
  > "Implement a binary search tree in Python with insert, delete, and traversal methods"
- Set title + due date → click **"Break It Down"**
- **Key moment:** Groq (Llama 3.3-70B) decomposes the assignment into micro-tasks, using Pinecone RAG from uploaded course materials for context
- See AI-generated tasks appear with XP values
- Click a task → marks complete with optimistic UI update

### 4. Google Calendar Scheduling
- With tasks visible, click **"Schedule"** on the assignment
- **Explain what happens:**
  1. Loads KDE peak focus windows (your most productive times of the week)
  2. Fetches Google Calendar FreeBusy
  3. Subtracts busy time from peak windows
  4. Assigns 30-min slots per task priority (greedy algorithm)
  5. Creates Google Calendar events
- Click **Calendar** tab → embedded Google Calendar showing the scheduled events

### 5. Focus Timer — Tracking Sessions
- Switch to **Timer** tab
- Start the stopwatch → animated blob pulses
- Run briefly → click stop
- **Rating modal:** rate focus (1–5) and productivity (1–3)
- Session saves → **FocusSessionCard** shows duration, time range, and emoji ratings
- **FocusSummaryCard** shows weekly total hours
- *Note: Focus sessions feed into KDE to detect peak productive times*

### 6. Analytics — Predictions & Improvement
- Switch to **Analytics** tab, select COMP2171
- **Trajectory chart** (Chart.js):
  - Solid cyan line: Jan–May predicted grades
  - Dashed amber line: projection to June final exam
- **Smart Nudges** (3 cards):
  - Current grade and final predicted grade
  - Exam countdown
  - Suggested habit adjustments (attendance, sleep, exercise, study, mental health)
- *Key moment:* The improvement suggestions come from a **genetic algorithm** (50 generations, 100 genomes per generation) that optimises study habits

### 7. Profile
- Click the avatar → **"Manage Profile"**
- Edit name, nickname
- **Toggle:** "Use calculated study hours" — switch between self-reported and auto-calculated (from focus session data)

---

## Tech Highlights Reference

| Feature | What's Under the Hood |
|---------|----------------------|
| Task decomposition | Groq (Llama 3.3-70B) + Pinecone vector RAG |
| Calendar scheduling | Circular KDE (Gaussian kernel) + Google Calendar API FreeBusy |
| Grade prediction | TensorFlow Keras model (9 input features, trained on ~600 students) |
| Trajectory projection | Linear regression on monthly grade history |
| Improvement engine | Genetic algorithm (tournament selection, crossover, mutation) |
| Focus analytics | Kernel Density Estimation on circular time (theta in [0, 2π)) |
| Course material RAG | PyPDF2 extraction → 100-word chunks → Pinecone upsert → similarity search |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `500` saving focus session | Ensure `student_study_data` row exists (included in `demo.sql`) |
| Google Calendar embed blank | User must be signed into Google in the browser (same account used for OAuth) |
| Grade predictions return error | Run `POST /api/sync/{student_id}/run` first to compute study hours |
| KDE peaks empty | Need at least a few focus sessions; `demo.sql` has 14 sessions across last week + today |
| "Break It Down" fails | Check Groq API key is set in `backend/.env` |
