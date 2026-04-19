import { Brain } from 'lucide-react';
import XpBanner from '@components/XpBanner';
import { useSessionStore } from '@lib/sessionStore';
import { useTaskSummary } from '@hooks/useTaskSummary';
import { useCourses } from '@hooks/useCourses';
import CourseCard from '@components/CourseCard';
import WeekStrip from '@components/WeekStrip';
import SectionHeader from '@components/SectionHeader';

type HomeDashboardProps = {
  studentName: string | null;
};

export default function HomeDashboard({ studentName }: HomeDashboardProps) {
  const studentId = useSessionStore((snapshot) => snapshot.studentId);
  const { completedCount, totalCount, totalXp, level } = useTaskSummary(studentId);
  const { courses, error: coursesError } = useCourses(studentId);

  const displayName = studentName?.trim() || 'Student';
  const displayId = studentId == null ? 'Unknown' : String(studentId).trim() || 'Unknown';

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
        <SectionHeader title="Courses" />
        {coursesError && <p className="text-sm text-red-300 px-2 mb-3">{coursesError}</p>}
        <div className="flex flex-col gap-4">
          {!coursesError && courses.length === 0 && (
            <p className="text-sm text-gray-400 px-2">No course records found yet.</p>
          )}

          {courses.map((course) => <CourseCard key={course.code} course={course} />)}
        </div>
      </section>
    </>
  );
}