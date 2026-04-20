"use client";

import { useMemo, useState } from 'react';
import { Brain } from 'lucide-react';
import XpBanner from '@components/XpBanner';
import { useSessionStore } from '@lib/sessionStore';
import { useTaskSummary } from '@hooks/useTaskSummary';
import { useCourses, type Course } from '@hooks/useCourses';
import CourseCard from '@components/CourseCard';
import CourseFormModal from '@components/CourseFormModal';
import WeekStrip from '@components/WeekStrip';
import SectionHeader from '@components/SectionHeader';

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

  const displayName = studentName?.trim() || 'Student';
  const displayId = studentId == null ? 'Unknown' : String(studentId).trim() || 'Unknown';

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

      <WeekStrip />

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