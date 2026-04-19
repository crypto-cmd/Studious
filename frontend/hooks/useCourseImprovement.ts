import { useEffect, useMemo, useState } from 'react';

type ImprovementApiResponse = {
    current_grade?: number | string | null;
    predicted_improved_grade?: number | string | null;
    improvements?: {
        attendance_percentage?: number | string | null;
        sleep_hours?: number | string | null;
        exercise_frequency?: number | string | null;
        mental_health_rating?: number | string | null;
        study_hours_per_day?: number | string | null;
        grade_improvement?: number | string | null;
    };
};

export type ImprovementMetric = {
    key: 'attendance_percentage' | 'sleep_hours' | 'exercise_frequency' | 'mental_health_rating' | 'study_hours_per_day';
    label: string;
    delta: number;
};

export type CourseImprovement = {
    currentGrade: number | null;
    predictedImprovedGrade: number | null;
    gradeImprovement: number;
    metrics: ImprovementMetric[];
};

const METRIC_LABELS: Record<ImprovementMetric['key'], string> = {
    attendance_percentage: 'Attendance',
    sleep_hours: 'Sleep',
    exercise_frequency: 'Exercise',
    mental_health_rating: 'Mental health',
    study_hours_per_day: 'Study time',
};

function toFiniteNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeImprovement(payload: unknown): CourseImprovement | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const response = payload as ImprovementApiResponse;
    const improvements = response.improvements ?? {};

    const metrics = (Object.keys(METRIC_LABELS) as Array<ImprovementMetric['key']>)
        .map((key) => ({
            key,
            label: METRIC_LABELS[key],
            delta: toFiniteNumber(improvements[key]) ?? 0,
        }))
        .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));

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

        const studentIdValue = String(studentId);

        fetch(
            `/api/improvement?student_id=${encodeURIComponent(studentIdValue)}&course_code=${encodeURIComponent(courseCode)}`,
            { cache: 'no-store' }
        )
            .then(async (response) => {
                const payload = await response.json();

                if (!response.ok) {
                    throw new Error(payload?.error ?? 'Unable to load smart nudges');
                }

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
