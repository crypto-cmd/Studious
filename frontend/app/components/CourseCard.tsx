import { Calendar, Hourglass } from 'lucide-react';
import type { Course } from '@hooks/useCourses';

type CourseCardProps = {
    course: Course;
};

export default function CourseCard({ course }: CourseCardProps) {
    return (
        <article className="bg-[#132e2a] rounded-3xl p-5 border border-[#1b3f3a] relative overflow-hidden group hover:border-cyan-400/50 transition-colors cursor-pointer">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-bold mb-1">{course.code}</h3>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Current:</span>
                        <span className="font-bold">{course.grade}</span>
                        {course.trend === 'up' && <span className="text-green-400 text-xs font-bold">▲</span>}
                        {course.trend === 'down' && <span className="text-red-400 text-xs font-bold">▼</span>}
                    </div>
                </div>
                <div className="bg-[#091f1c] px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[#1b3f3a]">
                    <Hourglass className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-cyan-400 font-semibold">{course.countdown}</span>
                </div>
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Exam Date: {course.examDate}
            </div>
        </article>
    );
}
