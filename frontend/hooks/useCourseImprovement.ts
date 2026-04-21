import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@hooks/useApi';

type ImprovementApiResponse = {
    current_profile?: {
        attendance_percentage?: number | string | null;
        sleep_hours_per_night?: number | string | null;
        exercise_hours_per_week?: number | string | null;
        mental_health_rating?: number | string | null;
        study_hours_per_day?: number | string | null;
    };
    suggested_profile?: {
        attendance_percentage?: number | string | null;
        sleep_hours_per_night?: number | string | null;
        exercise_hours_per_week?: number | string | null;
        mental_health_rating?: number | string | null;
        study_hours_per_day?: number | string | null;
    };
    current_grade?: number | string | null;
    predicted_improved_grade?: number | string | null;
    improvements?: {
        attendance_percentage?: number | string | null;
        sleep_hours_per_night?: number | string | null;
        exercise_hours_per_week?: number | string | null;
        mental_health_rating?: number | string | null;
        study_hours_per_day?: number | string | null;
        grade_improvement?: number | string | null;
    };
};

export type ImprovementMetric = {
    key: 'attendance_percentage' | 'sleep_hours_per_night' | 'exercise_hours_per_week' | 'mental_health_rating' | 'study_hours_per_day';
    label: string;
    delta: number;
};

export type CourseImprovement = {
    currentGrade: number | null;
    predictedImprovedGrade: number | null;
    gradeImprovement: number;
    metrics: ImprovementMetric[];
};

function toFiniteNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function buildMetric(key: ImprovementMetric['key'], label: string, value: unknown): ImprovementMetric {
    return {
        key,
        label,
        delta: toFiniteNumber(value) ?? 0,
    };
}

function normalizeImprovement(payload: unknown): CourseImprovement | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const response = payload as ImprovementApiResponse;
    const improvements = response.improvements ?? {};
    const metrics: ImprovementMetric[] = [
        buildMetric('attendance_percentage', 'Attendance', improvements.attendance_percentage),
        buildMetric('sleep_hours_per_night', 'Sleep', improvements.sleep_hours_per_night),
        buildMetric('exercise_hours_per_week', 'Exercise', improvements.exercise_hours_per_week),
        buildMetric('mental_health_rating', 'Mental health', improvements.mental_health_rating),
        buildMetric('study_hours_per_day', 'Study time', improvements.study_hours_per_day),
    ].sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));

    return {
        currentGrade: toFiniteNumber(response.current_grade),
        predictedImprovedGrade: toFiniteNumber(response.predicted_improved_grade),
        gradeImprovement: toFiniteNumber(improvements.grade_improvement) ?? 0,
        metrics,
    };
}

export function useCourseImprovement(studentId: string | number | null, courseCode: string) {
    const [data, setData] = useState<CourseImprovement | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (studentId == null || !courseCode) {
            setData(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        setIsLoading(true);
        setError(null);

        useApi(
            'improvement',
            'GET',
            { student_id: String(studentId), course_code: courseCode },
            {},
            { cache: 'no-store' },
            'Unable to load smart nudges'
        )
            .then((payload) => {
                return normalizeImprovement(payload);
            })
            .then((nextData) => {
                if (!isCancelled) {
                    setData(nextData);
                }
            })
            .catch((nextError: unknown) => {
                if (!isCancelled) {
                    setData(null);
                    setError(nextError instanceof Error ? nextError.message : 'Unable to load smart nudges');
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [courseCode, studentId]);

    const topPositiveMetric = useMemo(
        () => data?.metrics.find((metric) => metric.delta > 0) ?? null,
        [data]
    );

    const topNegativeMetric = useMemo(
        () => data?.metrics.find((metric) => metric.delta < 0) ?? null,
        [data]
    );

    return {
        data,
        isLoading,
        error,
        topPositiveMetric,
        topNegativeMetric,
    };
}
