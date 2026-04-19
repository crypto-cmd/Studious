import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Day = {
    dayStr: string;
    date: number;
    isActive: boolean;
};

type WeekStripProps = {
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
                isActive: date.toDateString() === currentDate.toDateString(),
            };
        }),
        label: formatMonthLabel(weekStart, weekEnd),
    };
}

export default function WeekStrip({ }: WeekStripProps) {
    const [weekOffset, setWeekOffset] = useState(0);

    const { days, label } = useMemo(() => buildWeek(new Date(), weekOffset), [weekOffset]);
    const isCurrentWeek = weekOffset === 0;

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

            <div className="flex justify-between items-center overflow-x-auto hide-scrollbar gap-2 px-1">
                {days.map((day) => (
                    <div
                        key={`${day.dayStr}-${day.date}`}
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
    );
}
