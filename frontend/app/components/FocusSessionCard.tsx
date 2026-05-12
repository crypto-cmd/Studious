import type { FocusSession } from '@hooks/useFocusSessions';

type FocusSessionCardProps = {
    session: FocusSession;
};

const FOCUS_LABELS = [
    null,
    { emoji: '😫', label: 'Very low' },
    { emoji: '🙁', label: 'Low' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '🤩', label: 'Great' },
] as const;

const PRODUCTIVITY_LABELS = [
    null,
    { emoji: '😫', label: 'Not' },
    { emoji: '😐', label: 'Somewhat' },
    { emoji: '🤩', label: 'Very' },
] as const;

function formatDuration(seconds: number) {
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
        return `${minutes} mins`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}

function getSessionDurationSeconds(session: FocusSession) {
    if (session.sessionStart && session.sessionEnd) {
        const startDate = new Date(session.sessionStart);
        const endDate = new Date(session.sessionEnd);

        if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate.getTime() >= startDate.getTime()) {
            return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
        }
    }

    return 0;
}

function formatTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function FocusSessionCard({ session }: FocusSessionCardProps) {
    const duration = getSessionDurationSeconds(session);
    const focus = session.focusScore != null ? FOCUS_LABELS[session.focusScore] ?? null : null;
    const productivity = session.productivityScore != null ? PRODUCTIVITY_LABELS[session.productivityScore] ?? null : null;
    const date = formatDate(session.sessionStart || session.createdAt);
    const startTime = formatTime(session.sessionStart);
    const endTime = formatTime(session.sessionEnd);

    return (
        <div className="bg-[#132e2a] rounded-2xl p-4 border border-[#1b3f3a]">
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-cyan-400 text-lg">{formatDuration(duration)}</span>
                {date && <span className="text-xs text-gray-500">{date}</span>}
            </div>

            {startTime && endTime && (
                <p className="text-xs text-gray-500 mb-3">{startTime} &mdash; {endTime}</p>
            )}

            <div className="flex gap-3">
                {focus && (
                    <span className="text-xs bg-[#091f1c] px-2.5 py-1 rounded-full border border-[#1b3f3a] text-gray-300">
                        {focus.emoji} Focus: {focus.label}
                    </span>
                )}
                {productivity && (
                    <span className="text-xs bg-[#091f1c] px-2.5 py-1 rounded-full border border-[#1b3f3a] text-gray-300">
                        {productivity.emoji} Productivity: {productivity.label}
                    </span>
                )}
            </div>
        </div>
    );
}
