"use client";
import { useEffect, useState } from 'react';
import { ListTodo, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import XpBanner from '../components/XpBanner';
import { useSessionStore } from '../../lib/sessionStore';

// --- Types ---
type MicroTask = {
  id: string;
  description: string;
  xp: number;
  completed: boolean;
};

type Assignment = {
  id: string;
  title?: string;
  instructions?: string;
  tasks: MicroTask[];
};

function normalizeCourseCodes(payload: unknown): string[] {
  const asRecord = payload as Record<string, unknown>;

  const candidateList =
    (asRecord?.courses as unknown) ??
    (asRecord?.course_codes as unknown) ??
    (asRecord?.courseCodes as unknown) ??
    (asRecord?.data as unknown) ??
    payload;

  if (!Array.isArray(candidateList)) {
    return [];
  }

  const normalized = candidateList
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (!item || typeof item !== 'object') {
        return '';
      }

      const record = item as Record<string, unknown>;
      const value =
        record.course_code ??
        record.courseCode ??
        record.code ??
        record.id;

      return typeof value === 'string' ? value.trim() : '';
    })
    .filter((code): code is string => code.length > 0);

  return [...new Set(normalized)];
}

export default function TaskManager() {
  const studentId = useSessionStore((snapshot) => snapshot.studentId);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [assignment, setAssignment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleTask = (assignmentId: string, taskId: string) => {
    setAssignments((prev) => prev.map((currentAssignment) => {
      if (currentAssignment.id !== assignmentId) {
        return currentAssignment;
      }

      return {
        ...currentAssignment,
        tasks: currentAssignment.tasks.map((task) => (
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )),
      };
    }));
  };

  const selectedAssignment = assignments.find((currentAssignment) => currentAssignment.id === selectedAssignmentId) ?? null;
  const visibleTasks = selectedAssignment?.tasks ?? [];

  const completedCount = visibleTasks.filter(t => t.completed).length;

  useEffect(() => {
    if (studentId == null) {
      setCourses([]);
      setSelectedCourse('');
      return;
    }

    const studentIdValue = String(studentId);
    setIsLoadingCourses(true);
    setErrorMessage(null);

    fetch(`/api/courses?student_id=${encodeURIComponent(studentIdValue)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? 'Unable to load courses');
        }

        const nextCourses = normalizeCourseCodes(data);

        setCourses(nextCourses);
        setSelectedCourse((currentCourse) => {
          if (currentCourse && nextCourses.includes(currentCourse)) {
            return currentCourse;
          }
          return nextCourses[0] ?? '';
        });
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load courses');
        setCourses([]);
        setSelectedCourse('');
      })
      .finally(() => {
        setIsLoadingCourses(false);
      });
  }, [studentId]);

  useEffect(() => {
    if (studentId == null || !selectedCourse) {
      setAssignments([]);
      setSelectedAssignmentId('');
      return;
    }

    const studentIdValue = String(studentId);
    setIsLoadingAssignments(true);
    setErrorMessage(null);

    fetch(`/api/tasks?student_id=${encodeURIComponent(studentIdValue)}&course_code=${encodeURIComponent(selectedCourse)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? 'Unable to load assignments');
        }

        const normalizedAssignments: Assignment[] = Array.isArray(data?.assignments)
          ? data.assignments.map((a: any) => ({
            id: String(a.id),
            title: typeof a.title === 'string' ? a.title : '',
            instructions: typeof a.instructions === 'string' ? a.instructions : '',
            tasks: Array.isArray(a.tasks)
              ? a.tasks.map((t: any, idx: number) => ({
                id: typeof t.id === 'string' ? t.id : `${a.id}-${idx}`,
                description: typeof t.task === 'string' ? t.task : 'Untitled task',
                xp: Number.isFinite(Number(t.xp)) ? Number(t.xp) : 0,
                completed: Boolean(t.completed),
              }))
              : [],
          }))
          : [];

        setAssignments(normalizedAssignments);
        setSelectedAssignmentId((currentId) => {
          if (currentId && normalizedAssignments.some((a) => a.id === currentId)) {
            return currentId;
          }
          return normalizedAssignments[0]?.id ?? '';
        });
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load assignments');
        setAssignments([]);
        setSelectedAssignmentId('');
      })
      .finally(() => {
        setIsLoadingAssignments(false);
      });
  }, [selectedCourse, studentId]);

  return (
    <>

      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <ListTodo className="text-cyan-400 w-8 h-8" />
          Task Manager
        </h1>
        <p className="text-gray-400 text-sm mt-1">Break down overwhelming assignments.</p>
      </header>

      <XpBanner level={5} xp={67} completed={completedCount} total={visibleTasks.length} />

      <section className="bg-[#132e2a] rounded-3xl p-5 mb-6 border border-[#1b3f3a] shadow-lg">
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full bg-[#0a1816] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm"
            disabled={isLoadingCourses || courses.length === 0}
          >
            {courses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              courses.map((courseCode) => (
                <option key={courseCode} value={courseCode}>
                  {courseCode}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Paste Assignment</label>
          <textarea
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            placeholder="Example: 'Write a report on the current effects of slavery in Jamaica, making reference to textbook Chapters 3 - 5'"
            className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm min-h-[100px] resize-none"
          />
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#0a1816] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm [color-scheme:dark]"
            />
          </div>
        </div>

        <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#091f1c] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          <Sparkles className="w-5 h-5" />
          Break It Down 🧩
        </button>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 px-2">Assignments</h2>
        <div className="flex flex-col gap-3 mb-6">
          {isLoadingAssignments && (
            <p className="text-sm text-gray-400 px-2">Loading assignments...</p>
          )}

          {!isLoadingAssignments && assignments.length === 0 && (
            <p className="text-sm text-gray-400 px-2">
              {selectedCourse ? `No assignments found for ${selectedCourse}.` : 'Select a course to view assignments.'}
            </p>
          )}

          {assignments.map((assignmentItem, index) => {
            const isSelected = assignmentItem.id === selectedAssignmentId;
            const titleText = assignmentItem.title?.trim() || assignmentItem.instructions?.trim() || `Assignment ${index + 1}`;

            return (
              <button
                key={assignmentItem.id}
                type="button"
                onClick={() => setSelectedAssignmentId(assignmentItem.id)}
                className={`w-full text-left bg-[#132e2a] rounded-2xl p-4 border transition-all ${isSelected
                  ? 'border-cyan-400/70'
                  : 'border-[#1b3f3a] hover:border-cyan-400/40'
                  }`}
              >
                <p className="text-sm text-white line-clamp-2">{titleText}</p>
                <p className="text-xs text-gray-400 mt-2">{assignmentItem.tasks.length} micro-tasks</p>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 px-2">Micro-Tasks</h2>
        {errorMessage && <p className="text-sm text-red-300 px-2 mb-3">{errorMessage}</p>}
        <div className="flex flex-col gap-3">
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => selectedAssignment && toggleTask(selectedAssignment.id, task.id)}
              className={`bg-[#132e2a] rounded-2xl p-4 border transition-all cursor-pointer flex items-start gap-3 ${task.completed
                ? 'border-[#1b3f3a]/50 opacity-60'
                : 'border-[#1b3f3a] hover:border-cyan-400/50'
                }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {task.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-500" />
                )}
              </div>

              <div className="flex-1">
                <p className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                  {task.description}
                </p>
              </div>

              <div className="flex-shrink-0 bg-[#091f1c] px-2 py-1 rounded-md border border-[#1b3f3a]">
                <span className="text-xs text-cyan-400 font-bold">+{task.xp} XP</span>
              </div>
            </div>
          ))}

          {!selectedAssignment && !isLoadingAssignments && (
            <p className="text-sm text-gray-400 px-2">Choose an assignment to view its micro-tasks.</p>
          )}
        </div>
      </section>

    </>
  );
}