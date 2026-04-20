import { useCallback, useEffect, useState } from 'react';
import { useApi as apiRequest } from '@hooks/useApi';

export type CoursePrediction = {
    grade: number;
    month: number;
};

export type Course = {
    code: string;
    title: string | null;
    grade: string;
    trend: 'up' | 'down' | 'stable';
    examDate: string;
    countdown: string;
    currentPredictedGrade: number | null;
    finalPredictedGrade: number | null;
    finalExamDate: string | null;
    predictedGrades: CoursePrediction[];
    sources: string[];
};

type CourseRow = {
    code?: string;
    title?: string | null;
    grade?: string | number | null;
    current_predicted_grade?: string | number | null;
    final_predicted_grade?: string | number | null;
    final_exam_date?: string | null;
    final_exam_month?: string | number | null;
    sources?: string[] | null;
    predicted_grades?: Array<{
        grade?: string | number | null;
        month?: string | number | null;
    }>;
};

type UseCoursesResult = {
    courses: Course[];
    isLoading: boolean;
    error: string | null;
    isMutating: boolean;
    mutationError: string | null;
    refresh: () => Promise<void>;
    addCourse: (payload: CourseMutationPayload) => Promise<void>;
    updateCourse: (courseCode: string, payload: Partial<CourseMutationPayload>) => Promise<void>;
    deleteCourse: (courseCode: string) => Promise<void>;
};

export type CourseMutationPayload = {
    code: string;
    title?: string | null;
    finalExamDate?: string;
};

function formatExamDate(value: string | number | null | undefined) {
    if (!value) {
        return 'No exam date set';
    }

    const parsedDate = new Date(String(value));
    if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    }

    const numericMonth = Number(value);
    if (Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
        return new Date(2026, numericMonth - 1, 1).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
        });
    }

    return String(value);
}

function formatCountdown(value: string | number | null | undefined) {
    if (!value) {
        return 'Date unavailable';
    }

    const parsedDate = new Date(String(value));
    if (Number.isNaN(parsedDate.getTime())) {
        const numericMonth = Number(value);
        if (Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
            return `Month ${numericMonth}`;
        }

        return String(value);
    }

    const diffDays = Math.ceil((parsedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return 'Past due';
    }

    if (diffDays === 0) {
        return 'Today';
    }

    if (diffDays === 1) {
        return '1 day';
    }

    if (diffDays < 30) {
        return `${diffDays} days`;
    }

    const months = Math.max(1, Math.round(diffDays / 30));
    return months === 1 ? '1 month' : `${months} months`;
}

function getCourseTrend(currentGrade: number, previousGrade: number | null): 'up' | 'down' | 'stable' {
    if (previousGrade == null) {
        return 'stable';
    }

    if (currentGrade > previousGrade) {
        return 'up';
    }

    if (currentGrade < previousGrade) {
        return 'down';
    }

    return 'stable';
}

function normalizePredictedGrades(predictedGrades: CourseRow['predicted_grades']): CoursePrediction[] {
    if (!Array.isArray(predictedGrades)) {
        return [];
    }

    return predictedGrades
        .map((item) => {
            const grade = Number(item?.grade);
            const month = Number(item?.month);

            if (!Number.isFinite(grade) || !Number.isFinite(month)) {
                return null;
            }

            return {
                grade,
                month,
            };
        })
        .filter((item): item is CoursePrediction => item != null)
        .sort((left, right) => left.month - right.month);
}

function normalizeCourses(payload: unknown): Course[] {
    const rows = Array.isArray(payload) ? payload : [];

    return rows.map((courseRow: CourseRow, index: number) => {
        const code = typeof courseRow.code === 'string' && courseRow.code.trim()
            ? courseRow.code.trim()
            : `Course ${index + 1}`;

        const title = typeof courseRow.title === 'string' && courseRow.title.trim()
            ? courseRow.title.trim()
            : null;

        const rawGrade = courseRow.current_predicted_grade ?? courseRow.final_predicted_grade ?? courseRow.grade;
        const numericGrade = rawGrade == null ? null : Number(rawGrade);
        const grade = numericGrade == null || Number.isNaN(numericGrade)
            ? (typeof rawGrade === 'string' && rawGrade.trim() ? rawGrade.trim() : 'N/A')
            : `${numericGrade.toFixed(1)}%`;

        const currentPredictedGrade = courseRow.current_predicted_grade == null
            ? null
            : Number(courseRow.current_predicted_grade);

        const finalPredictedGrade = courseRow.final_predicted_grade == null
            ? null
            : Number(courseRow.final_predicted_grade);

        const predictedGrades = normalizePredictedGrades(courseRow.predicted_grades);

        const previousGrade = predictedGrades.length >= 2
            ? predictedGrades[predictedGrades.length - 2].grade
            : currentPredictedGrade != null && finalPredictedGrade != null && !Number.isNaN(currentPredictedGrade) && !Number.isNaN(finalPredictedGrade)
                ? finalPredictedGrade
                : null;

        const trend = getCourseTrend(
            numericGrade == null || Number.isNaN(numericGrade) ? 0 : numericGrade,
            previousGrade != null && Number.isFinite(previousGrade) ? previousGrade : null
        );

        const examDateSource = courseRow.final_exam_date ?? courseRow.final_exam_month ?? null;

        return {
            code,
            title,
            grade,
            trend,
            examDate: formatExamDate(examDateSource),
            countdown: formatCountdown(examDateSource),
            currentPredictedGrade: currentPredictedGrade != null && Number.isFinite(currentPredictedGrade)
                ? currentPredictedGrade
                : null,
            finalPredictedGrade: finalPredictedGrade != null && Number.isFinite(finalPredictedGrade)
                ? finalPredictedGrade
                : null,
            finalExamDate: typeof courseRow.final_exam_date === 'string' ? courseRow.final_exam_date : null,
            predictedGrades,
            sources: Array.isArray(courseRow.sources)
                ? courseRow.sources.filter((source): source is string => typeof source === 'string' && source.trim().length > 0)
                : [],
        };
    });
}

export function useCourses(studentId: string | number | null): UseCoursesResult {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMutating, setIsMutating] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);

    const loadCourses = useCallback(async () => {
        if (studentId == null) {
            setCourses([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const payload = await apiRequest(
                'courses',
                'GET',
                { student_id: String(studentId) },
                {},
                { cache: 'no-store' },
                'Unable to load courses'
            );
            setCourses(normalizeCourses(payload));
        } catch (nextError: unknown) {
            setCourses([]);
            setError(nextError instanceof Error ? nextError.message : 'Unable to load courses');
        } finally {
            setIsLoading(false);
        }
    }, [studentId]);

    const refresh = useCallback(async () => {
        await loadCourses();
    }, [loadCourses]);

    const addCourse = useCallback(async (payload: CourseMutationPayload) => {
        if (studentId == null) {
            throw new Error('Missing student ID');
        }

        setIsMutating(true);
        setMutationError(null);

        try {
            await apiRequest(
                'courses',
                'POST',
                { student_id: String(studentId) },
                {
                    code: payload.code,
                    title: payload.title ?? null,
                    final_exam_date: payload.finalExamDate ?? null,
                },
                { cache: 'no-store' },
                'Unable to add course'
            );
            await loadCourses();
        } catch (nextError: unknown) {
            const message = nextError instanceof Error ? nextError.message : 'Unable to add course';
            setMutationError(message);
            throw new Error(message);
        } finally {
            setIsMutating(false);
        }
    }, [loadCourses, studentId]);

    const updateCourse = useCallback(async (courseCode: string, payload: Partial<CourseMutationPayload>) => {
        if (studentId == null) {
            throw new Error('Missing student ID');
        }

        setIsMutating(true);
        setMutationError(null);

        try {
            await apiRequest(
                'courses',
                'PATCH',
                {
                    student_id: String(studentId),
                    course_code: courseCode,
                },
                {
                    ...(payload.code !== undefined ? { code: payload.code } : {}),
                    ...(payload.title !== undefined ? { title: payload.title } : {}),
                    ...(payload.finalExamDate !== undefined ? { final_exam_date: payload.finalExamDate || null } : {}),
                },
                { cache: 'no-store' },
                'Unable to update course'
            );
            await loadCourses();
        } catch (nextError: unknown) {
            const message = nextError instanceof Error ? nextError.message : 'Unable to update course';
            setMutationError(message);
            throw new Error(message);
        } finally {
            setIsMutating(false);
        }
    }, [loadCourses, studentId]);

    const deleteCourse = useCallback(async (courseCode: string) => {
        if (studentId == null) {
            throw new Error('Missing student ID');
        }

        setIsMutating(true);
        setMutationError(null);

        try {
            await apiRequest(
                'courses',
                'DELETE',
                {
                    student_id: String(studentId),
                    course_code: courseCode,
                },
                {},
                { cache: 'no-store' },
                'Unable to delete course'
            );
            await loadCourses();
        } catch (nextError: unknown) {
            const message = nextError instanceof Error ? nextError.message : 'Unable to delete course';
            setMutationError(message);
            throw new Error(message);
        } finally {
            setIsMutating(false);
        }
    }, [loadCourses, studentId]);

    useEffect(() => {
        let isCancelled = false;

        loadCourses().catch(() => {
            if (isCancelled) {
                return;
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [loadCourses]);

    return {
        courses,
        isLoading,
        error,
        isMutating,
        mutationError,
        refresh,
        addCourse,
        updateCourse,
        deleteCourse,
    };
}
