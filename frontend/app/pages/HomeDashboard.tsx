"use client";

import { useEffect, useMemo, useState } from 'react';
import { Brain } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import XpBanner from '@components/XpBanner';
import { useSessionStore } from '@lib/sessionStore';
import { useTaskSummary } from '@hooks/useTaskSummary';
import { useCourses, type Course } from '@hooks/useCourses';
import CourseCard from '@components/CourseCard';
import CourseFormModal from '@components/CourseFormModal';
import WeekStrip from '@components/WeekStrip';
import SectionHeader from '@components/SectionHeader';
import AssignmentDueModal from '@components/AssignmentDueModal';
import { useApi } from '@hooks/useApi';
import { normalizeAssignments, normalizeDueDate, type Assignment } from '@lib/assignments';

type CourseFormMode = 'add' | 'edit';

type CourseFormState = {
  code: string;
  title: string;
  finalExamDate: string;
};

const EMPTY_FORM: CourseFormState = {
  code: '',
  title: '',
  finalExamDate: '',
};

type HomeDashboardProps = {
  studentName: string | null;
};

export default function HomeDashboard({ studentName }: HomeDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const studentId = useSessionStore((snapshot) => snapshot.studentId);
  const { completedCount, totalCount, totalXp, level } = useTaskSummary(studentId);
  const {
    courses,
    error: coursesError,
    isMutating,
    mutationError,
    addCourse,
    updateCourse,
    deleteCourse,
  } = useCourses(studentId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<CourseFormMode>('add');
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null);
  const [formState, setFormState] = useState<CourseFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [pendingDeleteCode, setPendingDeleteCode] = useState<string | null>(null);
  const [calendarAssignments, setCalendarAssignments] = useState<Assignment[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);

  const displayName = studentName?.trim() || 'Student';
  const displayId = studentId == null ? 'Unknown' : String(studentId).trim() || 'Unknown';

  useEffect(() => {
    if (studentId == null) {
      console.log('[HomeDashboard] No student ID; clearing calendar assignments.');
      setCalendarAssignments([]);
      setCalendarError(null);
      setSelectedDueDate(null);
      return;
    }

    if (courses.length === 0) {
      console.log('[HomeDashboard] No courses available yet; skipping calendar assignment load.');
      setCalendarAssignments([]);
      setCalendarError(null);
      return;
    }

    let isCancelled = false;
    setCalendarError(null);
    const studentIdValue = String(studentId);

    console.log('[HomeDashboard] Loading calendar assignments', {
      studentId: studentIdValue,
      courseCodes: courses.map((course) => course.code),
    });

    const loadCalendarAssignments = async () => {
      const assignmentGroups = await Promise.all(
        courses.map(async (course) => {
          try {
            const payload = await useApi(
              'tasks',
              'GET',
              { student_id: studentIdValue, course_code: course.code },
              {},
              { cache: 'no-store' },
              `Unable to load assignments for ${course.code}`
            );

            return normalizeAssignments(payload);
          } catch (error) {
            console.error('[HomeDashboard] Failed to load assignments for course', course.code, error);
            if (!isCancelled) {
              setCalendarError(error instanceof Error ? error.message : `Unable to load assignments for ${course.code}`);
            }

            return [] as Assignment[];
          }
        })
      );

      if (isCancelled) {
        return;
      }

      const nextAssignments = assignmentGroups.flat().filter((assignment) => Boolean(normalizeDueDate(assignment.dueDate)));
      console.log('[HomeDashboard] Calendar assignments loaded', {
        totalAssignments: nextAssignments.length,
        assignmentsWithDueDates: nextAssignments.map((assignment) => ({
          id: assignment.id,
          courseCode: assignment.courseCode,
          dueDate: assignment.dueDate,
          title: assignment.title,
        })),
      });
      setCalendarAssignments(nextAssignments);
    };

    void loadCalendarAssignments();

    return () => {
      isCancelled = true;
    };
  }, [courses, studentId]);

  const assignmentCountsByDate = useMemo(() => {
    const nextCounts = calendarAssignments.reduce<Record<string, number>>((counts, assignment) => {
      const dateKey = normalizeDueDate(assignment.dueDate);
      if (!dateKey) {
        return counts;
      }

      counts[dateKey] = (counts[dateKey] ?? 0) + 1;
      return counts;
    }, {});

    console.log('[HomeDashboard] Assignment counts by date', nextCounts);
    return nextCounts;
  }, [calendarAssignments]);

  const examCountsByDate = useMemo(() => {
    const nextCounts = courses.reduce<Record<string, number>>((counts, course) => {
      const dateKey = normalizeDueDate(course.finalExamDate);
      if (!dateKey) {
        return counts;
      }

      counts[dateKey] = (counts[dateKey] ?? 0) + 1;
      return counts;
    }, {});

    console.log('[HomeDashboard] Exam counts by date', nextCounts);
    return nextCounts;
  }, [courses]);

  useEffect(() => {
    if (!selectedDueDate) {
      return;
    }

    const hasMatchingAssignment = calendarAssignments.some((assignment) => normalizeDueDate(assignment.dueDate) === selectedDueDate);
    const hasMatchingExam = courses.some((course) => normalizeDueDate(course.finalExamDate) === selectedDueDate);

    if (!hasMatchingAssignment && !hasMatchingExam) {
      setSelectedDueDate(null);
    }
  }, [calendarAssignments, courses, selectedDueDate]);

  const selectedDueAssignments = useMemo(() => {
    if (!selectedDueDate) {
      return [];
    }

    const matchingAssignments = calendarAssignments.filter((assignment) => normalizeDueDate(assignment.dueDate) === selectedDueDate);
    console.log('[HomeDashboard] Selected due date assignments', {
      selectedDueDate,
      count: matchingAssignments.length,
      assignmentIds: matchingAssignments.map((assignment) => assignment.id),
    });
    return matchingAssignments;
  }, [calendarAssignments, selectedDueDate]);

  const selectedDueExams = useMemo(() => {
    if (!selectedDueDate) {
      return [] as Array<{ courseCode: string; courseTitle: string | null }>;
    }

    const matchingExams = courses
      .filter((course) => normalizeDueDate(course.finalExamDate) === selectedDueDate)
      .map((course) => ({
        courseCode: course.code,
        courseTitle: course.title,
      }));

    console.log('[HomeDashboard] Selected due date exams', {
      selectedDueDate,
      count: matchingExams.length,
      courseCodes: matchingExams.map((exam) => exam.courseCode),
    });

    return matchingExams;
  }, [courses, selectedDueDate]);

  const openAssignmentFromModal = (assignment: Assignment) => {
    if (!assignment.courseCode) {
      console.warn('[HomeDashboard] Assignment missing courseCode, cannot navigate', assignment);
      return;
    }

    console.log('[HomeDashboard] Navigating to task manager from assignment', {
      assignmentId: assignment.id,
      courseCode: assignment.courseCode,
    });

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('tab', 'tasks');
    nextParams.set('course', assignment.courseCode);
    nextParams.set('assignment', assignment.id);

    router.push(`${pathname}?${nextParams.toString()}`);
  };

  const combinedError = useMemo(() => {
    return mutationError ?? formError;
  }, [mutationError, formError]);

  const openAddCourseForm = () => {
    setFormMode('add');
    setEditingCourseCode(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
    setUploadStatusMessage(null);
    setIsFormOpen(true);
  };

  const openEditCourseForm = (course: Course) => {
    setFormMode('edit');
    setEditingCourseCode(course.code);
    setFormState({
      code: course.code,
      title: course.title ?? '',
      finalExamDate: course.finalExamDate ?? '',
    });
    setFormError(null);
    setUploadStatusMessage(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isMutating) {
      return;
    }

    setIsFormOpen(false);
    setEditingCourseCode(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
    setUploadStatusMessage(null);
  };

  const handleUploadCourseMaterial = async (file: File) => {
    if (studentId == null) {
      throw new Error('Missing student ID.');
    }

    if (!editingCourseCode) {
      throw new Error('Open an existing course to upload material.');
    }

    const isPdfMime = file.type === 'application/pdf';
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !hasPdfExtension) {
      throw new Error('Only PDF files are supported.');
    }

    setIsUploadingMaterial(true);
    setUploadStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/course-material?student_id=${encodeURIComponent(String(studentId))}&course_code=${encodeURIComponent(editingCourseCode)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error?: string }).error)
          : 'Unable to upload course PDF.';
        throw new Error(message);
      }

      setUploadStatusMessage('Course PDF uploaded successfully.');
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const handleSubmitCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const courseCode = formState.code.trim().toUpperCase();
    if (!courseCode) {
      setFormError('Course code is required.');
      return;
    }

    try {
      if (formMode === 'add') {
        await addCourse({
          code: courseCode,
          title: formState.title.trim() || null,
          finalExamDate: formState.finalExamDate || undefined,
        });
      } else {
        if (!editingCourseCode) {
          setFormError('No course selected to update.');
          return;
        }

        await updateCourse(editingCourseCode, {
          code: courseCode,
          title: formState.title.trim() || null,
          finalExamDate: formState.finalExamDate,
        });
      }

      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save course.');
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    const shouldDelete = window.confirm(`Delete ${course.code}? This action cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    setPendingDeleteCode(course.code);
    setFormError(null);

    try {
      await deleteCourse(course.code);
      if (editingCourseCode === course.code) {
        closeForm();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete course.');
    } finally {
      setPendingDeleteCode(null);
    }
  };

  return (
    <>
      <header className="flex items-center gap-2 mb-6">
        <Brain className="text-cyan-400 w-8 h-8" />
        <div>
          <p className="text-gray-400 text-sm">Welcome back</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{displayName}</h1>
          <p className="text-gray-500 text-xs mt-1 break-all">ID: {displayId}</p>
        </div>
      </header>

      <XpBanner level={level} xp={totalXp} completed={completedCount} total={totalCount} />

      {calendarError && <p className="text-sm text-red-300 px-2 mb-3">{calendarError}</p>}

      <WeekStrip
        assignmentCountsByDate={assignmentCountsByDate}
        examCountsByDate={examCountsByDate}
        onDaySelect={setSelectedDueDate}
      />

      <AssignmentDueModal
        isOpen={Boolean(selectedDueDate && (selectedDueAssignments.length > 0 || selectedDueExams.length > 0))}
        dueDate={selectedDueDate}
        assignments={selectedDueAssignments}
        exams={selectedDueExams}
        onClose={() => setSelectedDueDate(null)}
        onSelectAssignment={openAssignmentFromModal}
      />

      <section>
        <SectionHeader
          title="Courses"
          action={(
            <button
              type="button"
              onClick={openAddCourseForm}
              disabled={isMutating}
              className="text-sm font-semibold text-cyan-300 border border-cyan-500/60 rounded-lg px-3 py-1.5 hover:bg-cyan-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add course
            </button>
          )}
        />

        <CourseFormModal
          isOpen={isFormOpen}
          mode={formMode}
          course={editingCourseCode ? courses.find((c) => c.code === editingCourseCode) : undefined}
          formState={formState}
          onFormChange={(field, value) => setFormState((current) => ({ ...current, [field]: value }))}
          onSubmit={handleSubmitCourse}
          onClose={closeForm}
          onUploadMaterial={formMode === 'edit' ? handleUploadCourseMaterial : undefined}
          isUploadingMaterial={isUploadingMaterial}
          uploadStatusMessage={uploadStatusMessage}
          error={combinedError}
          isLoading={isMutating || isUploadingMaterial}
        />

        {coursesError && <p className="text-sm text-red-300 px-2 mb-3">{coursesError}</p>}

        <div className="flex flex-col gap-4">
          {!coursesError && courses.length === 0 && (
            <p className="text-sm text-gray-400 px-2">No course records found yet.</p>
          )}

          {courses.map((course) => (
            <CourseCard
              key={course.code}
              course={course}
              onEdit={openEditCourseForm}
              onDelete={handleDeleteCourse}
              isBusy={isMutating && pendingDeleteCode === course.code}
            />
          ))}
        </div>
      </section>
    </>
  );
}