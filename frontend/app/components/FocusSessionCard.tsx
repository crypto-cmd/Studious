import type { FocusSession } from '@hooks/useFocusSessions';

type FocusSessionCardProps = {
    session: FocusSession;
};

function parseTimeToSeconds(value: string) {
    const [hoursRaw, minutesRaw, secondsRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        !Number.isFinite(seconds) ||
        hours < 0 ||
        minutes < 0 ||
        seconds < 0
    ) {
        return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

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

    const startSeconds = parseTimeToSeconds(session.startTime);
    const endSeconds = parseTimeToSeconds(session.endTime);

    if (startSeconds == null || endSeconds == null) {
        return 0;
    }

    if (endSeconds >= startSeconds) {
        return endSeconds - startSeconds;
    }

    return 24 * 3600 - startSeconds + endSeconds;
}

function formatSessionDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown date';
    }

    return date.toLocaleString();
}

export default function FocusSessionCard({ session }: FocusSessionCardProps) {
    const sessionDate = session.sessionStart || session.createdAt;

    return (
        <div className="bg-[#132e2a] rounded-2xl p-4 border border-[#1b3f3a] flex justify-between items-center">
            <div>
                <span className="font-bold text-cyan-400">{formatDuration(getSessionDurationSeconds(session))}</span>
                <p className="text-xs text-gray-400 mt-1">
                    {session.dayOfWeek || formatSessionDate(sessionDate)} · {session.startTime || session.sessionStart || 'Start unavailable'} - {session.endTime || session.sessionEnd || 'End unavailable'}
                </p>
            </div>
        </div>
    );
}
