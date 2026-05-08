import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@hooks/useApi';

export type FocusSession = {
    id: string;
    sessionStart: string;
    sessionEnd: string;
    thetaStart: number | null;
    thetaEnd: number | null;
    createdAt: string;
    focusScore: number | null;
    mentalHealthRating: number | null;
    productivityScore: number | null;
    qualityScore: number | null;
};

type UseFocusSessionsResult = {
    recentSessions: FocusSession[];
    totalFocusHours: number;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    saveSession: (durationSeconds: number, focusScore: number, productivityScore: number) => Promise<void>;
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
        const sessionStartValue = sessionRecord.session_start;
        const sessionEndValue = sessionRecord.session_end;
        const thetaStartValue = sessionRecord.theta_start;
        const thetaEndValue = sessionRecord.theta_end;
        const createdAtValue = sessionRecord.created_at;
        const focusScoreValue = sessionRecord.focus_score;
        const productivityScoreValue = sessionRecord.productivity_score;
        const mentalHealthRatingValue = sessionRecord.mental_health_rating;
        const qualityScoreValue = sessionRecord.quality_score;

        return {
            id: idValue == null ? `session-${index}` : String(idValue),
            sessionStart: typeof sessionStartValue === 'string' ? sessionStartValue : '',
            sessionEnd: typeof sessionEndValue === 'string' ? sessionEndValue : '',
            thetaStart: Number.isFinite(Number(thetaStartValue)) ? Number(thetaStartValue) : null,
            thetaEnd: Number.isFinite(Number(thetaEndValue)) ? Number(thetaEndValue) : null,
            createdAt: typeof createdAtValue === 'string' ? createdAtValue : '',
            focusScore: Number.isFinite(Number(focusScoreValue)) ? Number(focusScoreValue) : null,
            productivityScore: Number.isFinite(Number(productivityScoreValue)) ? Number(productivityScoreValue) : null,
            mentalHealthRating: Number.isFinite(Number(mentalHealthRatingValue)) ? Number(mentalHealthRatingValue) : null,
            qualityScore: Number.isFinite(Number(qualityScoreValue)) ? Number(qualityScoreValue) : null,
        };
    });
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

function getTotalFocusHours(sessions: FocusSession[]) {
    const totalSeconds = sessions.reduce((sum, session) => sum + getSessionDurationSeconds(session), 0);
    return Math.round((totalSeconds / 3600) * 10) / 10;
}

export function useFocusSessions(studentId: string | number | null): UseFocusSessionsResult {
    const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (studentId == null) {
            setRecentSessions([]);
            setError(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const payload = await apiRequest(
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
    }, [studentId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const saveSession = async (durationSeconds: number, focusScore: number, productivityScore: number) => {
        if (studentId == null || durationSeconds <= 0) {
            return;
        }

        const normalizedFocusScore = Math.max(1, Math.min(5, Math.round(focusScore)));
        const normalizedProductivityScore = Math.max(1, Math.min(3, Math.round(productivityScore)));

        setIsSaving(true);

        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - durationSeconds * 1000);
            const sessionStart = startDate.toISOString();
            const sessionEnd = endDate.toISOString();


            await apiRequest(
                'focus-sessions',
                'POST',
                { student_id: String(studentId) },
                {
                    session_start: sessionStart,
                    session_end: sessionEnd,
                    focus_score: normalizedFocusScore,
                    productivity_score: normalizedProductivityScore,
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
