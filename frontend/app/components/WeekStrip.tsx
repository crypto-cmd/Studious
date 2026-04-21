import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Day = {
    dayStr: string;
    date: number;
    dateKey: string;
    isActive: boolean;
};

type WeekStripProps = {
    assignmentCountsByDate: Record<string, number>;
    examCountsByDate: Record<string, number>;
    onDaySelect: (dateKey: string) => void;
};

type WeekView = {
    days: Day[];
    label: string;
};

function formatMonthLabel(startDate: Date, endDate: Date): string {
    const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
        return monthFormatter.format(startDate);
    }

    const startLabel = monthFormatter.format(startDate);
    const endLabel = monthFormatter.format(endDate);

    return `${startLabel} - ${endLabel}`;
}

function buildWeek(startDate: Date, offsetWeeks: number): WeekView {
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const currentDay = currentDate.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() + mondayOffset + offsetWeeks * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
        days: Array.from({ length: 7 }, (_, index) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);

            return {
                dayStr: date.toLocaleDateString(undefined, { weekday: 'short' }),
                date: date.getDate(),
                dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                isActive: date.toDateString() === currentDate.toDateString(),
            };
        }),
        label: formatMonthLabel(weekStart, weekEnd),
    };
}

export default function WeekStrip({ assignmentCountsByDate, examCountsByDate, onDaySelect }: WeekStripProps) {
    const [weekOffset, setWeekOffset] = useState(0);

    const { days, label } = useMemo(() => buildWeek(new Date(), weekOffset), [weekOffset]);
    const isCurrentWeek = weekOffset === 0;

    useEffect(() => {
        console.log('[WeekStrip] Render state', {
            weekOffset,
            label,
            assignmentCountsByDate,
            examCountsByDate,
            days: days.map((day) => ({
                dateKey: day.dateKey,
                date: day.date,
                assignmentCount: assignmentCountsByDate[day.dateKey] ?? 0,
                examCount: examCountsByDate[day.dateKey] ?? 0,
                isActive: day.isActive,
            })),
        });
    }, [assignmentCountsByDate, days, examCountsByDate, label, weekOffset]);

    return (
        <section className="bg-[#132e2a] rounded-3xl p-4 mb-6 shadow-lg border border-[#1b3f3a]">
            <div className="flex justify-between items-center mb-4 px-2 gap-3">
                <button
                    type="button"
                    onClick={() => setWeekOffset((currentOffset) => currentOffset - 1)}
                    className="w-8 h-8 rounded-full border border-[#1b3f3a] text-gray-300 hover:text-white hover:bg-[#1b3f3a] transition-colors flex items-center justify-center"
                    aria-label="Show previous week"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center min-w-0">
                    <h2 className="font-bold text-lg truncate">{label}</h2>
                    <button
                        type="button"
                        onClick={() => setWeekOffset(0)}
                        disabled={isCurrentWeek}
                        className="mt-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                        aria-label="Return to the current week"
                    >
                        Today
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => setWeekOffset((currentOffset) => currentOffset + 1)}
                    className="w-8 h-8 rounded-full border border-[#1b3f3a] text-gray-300 hover:text-white hover:bg-[#1b3f3a] transition-colors flex items-center justify-center"
                    aria-label="Show next week"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 px-1 sm:flex sm:justify-between sm:items-center sm:gap-2 overflow-visible">
                {days.map((day) => (
                    <button
                        key={`${day.dayStr}-${day.date}`}
                        type="button"
                        onClick={() => {
                            const assignmentCount = assignmentCountsByDate[day.dateKey] ?? 0;
                            const examCount = examCountsByDate[day.dateKey] ?? 0;
                            const hasEvents = assignmentCount > 0 || examCount > 0;
                            console.log('[WeekStrip] Day clicked', {
                                dateKey: day.dateKey,
                                assignmentCount,
                                examCount,
                                hasAssignments: assignmentCount > 0,
                                hasExams: examCount > 0,
                                hasEvents,
                            });

                            if (hasEvents) {
                                onDaySelect(day.dateKey);
                            }
                        }}
                        className={`relative flex flex-col items-center justify-center rounded-xl min-w-0 py-2 px-1 transition-all ${day.isActive
                            ? 'bg-cyan-400 text-[#091f1c] font-bold shadow-md'
                            : 'text-gray-400 hover:bg-[#1b3f3a]'
                            } ${((assignmentCountsByDate[day.dateKey] ?? 0) > 0 || (examCountsByDate[day.dateKey] ?? 0) > 0) ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'} sm:min-w-[45px] sm:p-2`}
                    >
                        <span className="text-[10px] sm:text-xs mb-1">{day.dayStr}</span>
                        <span className="text-sm sm:text-lg leading-none">{day.date}</span>
                        {(assignmentCountsByDate[day.dateKey] ?? 0) > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
                                <span className="absolute h-full w-full rounded-full bg-red-400/30 animate-ping" />
                                <span className="relative h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                            </span>
                        )}
                        {(examCountsByDate[day.dateKey] ?? 0) > 0 && (
                            <span className="absolute -top-0.5 -left-0.5 flex h-4 w-4 items-center justify-center">
                                <span className="absolute h-full w-full rounded-full bg-amber-300/30 animate-ping" />
                                <span className="relative h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]" />
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}
