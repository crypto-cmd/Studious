import { useRouter } from 'next/navigation';
import { Calendar, Hourglass, Pencil, Trash2 } from 'lucide-react';
import type { Course } from '@hooks/useCourses';

type CourseCardProps = {
    course: Course;
    onEdit?: (course: Course) => void;
    onDelete?: (course: Course) => void;
    isBusy?: boolean;
};

export default function CourseCard({ course, onEdit, onDelete, isBusy = false }: CourseCardProps) {
    const router = useRouter();

    const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
        // Don't navigate if clicking on buttons
        if ((event.target as HTMLElement).closest('button')) {
            return;
        }

        router.push(`?tab=analytics&course=${encodeURIComponent(course.code)}`);
    };

    return (
        <article className="bg-[#132e2a] rounded-3xl p-5 border border-[#1b3f3a] relative overflow-hidden group hover:border-cyan-400/50 transition-colors flex flex-col cursor-pointer" onClick={handleCardClick}>
            {/* Top right countdown badge */}
            <div className="absolute top-4 right-4 bg-[#091f1c] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[#1b3f3a]">
                <Hourglass className="w-3 h-3 text-cyan-400" />
                <span className="text-xs text-cyan-400 font-semibold">{course.countdown}</span>
            </div>

            {/* Main content */}
            <div className="flex-1 mb-4 pr-20">
                <div className="mb-3">
                    <h3 className="text-2xl font-bold mb-1">{course.code}</h3>
                    {course.title && <p className="text-sm text-gray-300 mb-2">{course.title}</p>}
                </div>

                <div className="flex items-center gap-2 text-sm mb-3">
                    <span className="text-gray-400">Current:</span>
                    <span className="font-bold">{course.grade}</span>
                    {course.trend === 'up' && <span className="text-green-400 text-xs font-bold">▲</span>}
                    {course.trend === 'down' && <span className="text-red-400 text-xs font-bold">▼</span>}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    Exam Date: {course.examDate}
                </div>
            </div>

            {/* Bottom right buttons */}
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    aria-label={`Edit ${course.code}`}
                    onClick={() => onEdit?.(course)}
                    disabled={isBusy}
                    className="w-8 h-8 rounded-lg border border-[#1b3f3a] bg-[#091f1c] text-gray-300 hover:text-cyan-300 hover:border-cyan-400/50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Pencil className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    aria-label={`Delete ${course.code}`}
                    onClick={() => onDelete?.(course)}
                    disabled={isBusy}
                    className="w-8 h-8 rounded-lg border border-[#4a1f1f] bg-[#2a1212] text-red-300 hover:text-red-200 hover:border-red-400/70 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </article>
    );
}
