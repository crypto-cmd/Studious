import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@hooks/useApi';

export type FocusSession = {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    createdAt: string;
};

type UseFocusSessionsResult = {
    recentSessions: FocusSession[];
    totalFocusHours: number;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    saveSession: (durationSeconds: number) => Promise<void>;
};

function normalizeSessions(payload: unknown): FocusSession[] {
    const asRecord = payload as Record<string, unknown>;
    const sessionsRaw = asRecord?.sessions;

    if (!Array.isArray(sessionsRaw)) {
        return [];
    }

    return sessionsRaw.map((sessionRaw, index) => {
        const sessionRecord = sessionRaw as Record<string, unknown>;
        const idValue = sessionRecord.id;
        const dayOfWeekValue = sessionRecord.day_of_week;
        const startTimeValue = sessionRecord.start_time;
        const endTimeValue = sessionRecord.end_time;
        const createdAtValue = sessionRecord.created_at;

        return {
            id: idValue == null ? `session-${index}` : String(idValue),
            dayOfWeek: typeof dayOfWeekValue === 'string' ? dayOfWeekValue : '',
            startTime: typeof startTimeValue === 'string' ? startTimeValue : '',
            endTime: typeof endTimeValue === 'string' ? endTimeValue : '',
            createdAt: typeof createdAtValue === 'string' ? createdAtValue : '',
        };
    });
}

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

function getSessionDurationSeconds(session: FocusSession) {
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

function getTotalFocusHours(sessions: FocusSession[]) {
    const totalSeconds = sessions.reduce((sum, session) => sum + getSessionDurationSeconds(session), 0);
    return Math.round((totalSeconds / 3600) * 10) / 10;
}

export function useFocusSessions(studentId: string | number | null): UseFocusSessionsResult {
    const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        if (studentId == null) {
            setRecentSessions([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            const payload = await useApi(
                'focus-sessions',
                'GET',
                { student_id: String(studentId) },
                {},
                { cache: 'no-store' },
                'Unable to load recent sessions'
            );

            setRecentSessions(normalizeSessions(payload));
            setError(null);
        } catch (errorValue: unknown) {
            setError(errorValue instanceof Error ? errorValue.message : 'Unable to load recent sessions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, [studentId]);

    const saveSession = async (durationSeconds: number) => {
        if (studentId == null || durationSeconds <= 0) {
            return;
        }

        setIsSaving(true);

        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - durationSeconds * 1000);
            const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
            const startTime = startDate.toTimeString().slice(0, 8);
            const endTime = endDate.toTimeString().slice(0, 8);

            await useApi(
                'focus-sessions',
                'POST',
                { student_id: String(studentId) },
                {
                    day_of_week: dayOfWeek,
                    start_time: startTime,
                    end_time: endTime,
                },
                {},
                'Unable to save session'
            );

            setError(null);
            await refresh();
        } catch (errorValue: unknown) {
            setError(errorValue instanceof Error ? errorValue.message : 'Unable to save session');
        } finally {
            setIsSaving(false);
        }
    };

    const totalFocusHours = useMemo(() => getTotalFocusHours(recentSessions), [recentSessions]);

    return {
        recentSessions,
        totalFocusHours,
        isLoading,
        isSaving,
        error,
        refresh,
        saveSession,
    };
}
