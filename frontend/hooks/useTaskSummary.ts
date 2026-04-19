import { useEffect, useMemo, useState } from 'react';

type TaskSummary = {
    completedCount: number;
    totalCount: number;
    totalXp: number;
};

type AssignmentTask = {
    completed: boolean;
    xp: number;
};

type Assignment = {
    tasks: AssignmentTask[];
};

type UseTaskSummaryOptions = {
    refreshKey?: number;
};

const EMPTY_SUMMARY: TaskSummary = {
    completedCount: 0,
    totalCount: 0,
    totalXp: 0,
};

function normalizeAssignments(payload: unknown): Assignment[] {
    const asRecord = payload as Record<string, unknown>;
    const assignmentsRaw = asRecord?.assignments;

    if (!Array.isArray(assignmentsRaw)) {
        return [];
    }

    return assignmentsRaw.map((assignmentRaw) => {
        const assignmentRecord = assignmentRaw as Record<string, unknown>;
        const tasksRaw = assignmentRecord.tasks;

        const tasks = Array.isArray(tasksRaw)
            ? tasksRaw.map((taskRaw) => {
                const taskRecord = taskRaw as Record<string, unknown>;
                return {
                    completed: Boolean(taskRecord.completed),
                    xp: Number.isFinite(Number(taskRecord.xp)) ? Number(taskRecord.xp) : 0,
                };
            })
            : [];

        return { tasks };
    });
}

function normalizeCourseCodes(payload: unknown): string[] {
    const asRecord = payload as Record<string, unknown>;

    const candidateList =
        (asRecord?.courses as unknown) ??
        (asRecord?.course_codes as unknown) ??
        (asRecord?.courseCodes as unknown) ??
        (asRecord?.data as unknown) ??
        payload;

    if (!Array.isArray(candidateList)) {
        return [];
    }

    const normalized = candidateList
        .map((item) => {
            if (typeof item === 'string') {
                return item.trim();
            }

            if (!item || typeof item !== 'object') {
                return '';
            }

            const record = item as Record<string, unknown>;
            const value = record.course_code ?? record.courseCode ?? record.code ?? record.id;

            return typeof value === 'string' ? value.trim() : '';
        })
        .filter((code): code is string => code.length > 0);

    return [...new Set(normalized)];
}

export function useTaskSummary(studentId: string | number | null, options?: UseTaskSummaryOptions) {
    const [summary, setSummary] = useState<TaskSummary>(EMPTY_SUMMARY);
    const refreshKey = options?.refreshKey ?? 0;

    useEffect(() => {
        if (studentId == null) {
            setSummary(EMPTY_SUMMARY);
            return;
        }

        let isCancelled = false;
        const studentIdValue = String(studentId);

        fetch(`/api/courses?student_id=${encodeURIComponent(studentIdValue)}`, {
            cache: 'no-store',
        })
            .then(async (coursesResponse) => {
                const coursesPayload = await coursesResponse.json();
                if (!coursesResponse.ok) {
                    throw new Error(coursesPayload?.error ?? 'Unable to load courses');
                }

                const courseCodes = normalizeCourseCodes(coursesPayload);
                if (courseCodes.length === 0) {
                    return [] as Assignment[];
                }

                const assignmentGroups = await Promise.all(
                    courseCodes.map(async (courseCode) => {
                        const assignmentsResponse = await fetch(
                            `/api/tasks?student_id=${encodeURIComponent(studentIdValue)}&course_code=${encodeURIComponent(courseCode)}`,
                            {
                                cache: 'no-store',
                            }
                        );

                        const assignmentsPayload = await assignmentsResponse.json();
                        if (!assignmentsResponse.ok) {
                            throw new Error(assignmentsPayload?.error ?? `Unable to load assignments for ${courseCode}`);
                        }

                        return normalizeAssignments(assignmentsPayload);
                    })
                );

                return assignmentGroups.flat();
            })
            .then((allAssignments) => {
                if (isCancelled) {
                    return;
                }

                const allTasks = allAssignments.flatMap((assignment) => assignment.tasks);
                const completedTasks = allTasks.filter((task) => task.completed).length;
                const xpSum = allTasks.reduce((sum, task) => sum + task.xp, 0);

                setSummary({
                    completedCount: completedTasks,
                    totalCount: allTasks.length,
                    totalXp: xpSum,
                });
            })
            .catch(() => {
                if (isCancelled) {
                    return;
                }

                setSummary(EMPTY_SUMMARY);
            });

        return () => {
            isCancelled = true;
        };
    }, [refreshKey, studentId]);

    const level = useMemo(() => Math.max(1, Math.floor(summary.totalXp / 100) + 1), [summary.totalXp]);

    const incrementCompleted = (delta = 1) => {
        if (delta === 0) {
            return;
        }

        setSummary((current) => {
            const nextCompleted = Math.min(current.totalCount, Math.max(0, current.completedCount + delta));
            return {
                ...current,
                completedCount: nextCompleted,
            };
        });
    };

    return {
        ...summary,
        level,
        incrementCompleted,
    };
}
