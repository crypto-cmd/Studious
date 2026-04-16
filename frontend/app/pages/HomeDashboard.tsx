import { Calendar, Brain, ChevronRight, ArrowLeft, Hourglass } from 'lucide-react';
import XpBanner from '../components/XpBanner';

// --- Types ---
type Course = {
  code: string;
  grade: string;
  trend: 'up' | 'down' | 'stable';
  examDate: string;
  countdown: string;
};

type Day = {
  dayStr: string;
  date: number;
  isActive: boolean;
};

// --- Mock Data ---
const courses: Course[] = [
  { code: 'COMP3901', grade: '95%', trend: 'up', examDate: 'April 3rd, 2026', countdown: '3 months' },
  { code: 'MATH2201', grade: '72%', trend: 'down', examDate: 'April 15th, 2026', countdown: '3.5 months' }
];

const currentWeek: Day[] = [
  { dayStr: 'Mon', date: 16, isActive: false },
  { dayStr: 'Tue', date: 17, isActive: false },
  { dayStr: 'Wed', date: 18, isActive: true },
  { dayStr: 'Thu', date: 19, isActive: false },
  { dayStr: 'Fri', date: 20, isActive: false },
  { dayStr: 'Sat', date: 21, isActive: false },
  { dayStr: 'Sun', date: 22, isActive: false },
];

export default function HomeDashboard() {
  return (
    <>

      <header className="flex items-center gap-2 mb-6">
        <Brain className="text-cyan-400 w-8 h-8" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hi Olu,</h1>
          <p className="text-gray-400 text-sm">Welcome back</p>
        </div>
      </header>

      <XpBanner level={5} xp={67} completed={2} total={7} />

      <section className="bg-[#132e2a] rounded-3xl p-4 mb-6 shadow-lg border border-[#1b3f3a]">
        <div className="flex justify-between items-center mb-4 px-2">
          <ArrowLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
          <h2 className="font-bold text-lg">March 2026</h2>
          <ChevronRight className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
        </div>

        <div className="flex justify-between items-center overflow-x-auto hide-scrollbar gap-2 px-1">
          {currentWeek.map((day) => (
            <div
              key={day.date}
              className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[45px] transition-colors ${day.isActive
                  ? 'bg-cyan-400 text-[#091f1c] font-bold shadow-md'
                  : 'text-gray-400 hover:bg-[#1b3f3a]'
                }`}
            >
              <span className="text-xs mb-1">{day.dayStr}</span>
              <span className="text-lg">{day.date}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 px-2">Courses</h2>
        <div className="flex flex-col gap-4">
          {courses.map((course) => (
            <div
              key={course.code}
              className="bg-[#132e2a] rounded-3xl p-5 border border-[#1b3f3a] relative overflow-hidden group hover:border-cyan-400/50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{course.code}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Current:</span>
                    <span className="font-bold">{course.grade}</span>
                    {course.trend === 'up' && <span className="text-green-400 text-xs font-bold">▲ +3%</span>}
                    {course.trend === 'down' && <span className="text-red-400 text-xs font-bold">▼ -2%</span>}
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
            </div>
          ))}
        </div>
      </section>

    </>
  );
}