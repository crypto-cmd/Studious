import { useEffect, useState } from 'react';

export type MicroTask = {
    id: string;
    description: string;
    xp: number;
    completed: boolean;
};

export type Assignment = {
    id: string;
    title?: string;
    instructions?: string;
    tasks: MicroTask[];
};

type UseTaskManagerOptions = {
    onTaskCompleted?: (delta: number) => void;
};

type UseTaskManagerResult = {
    courses: string[];
    selectedCourse: string;
    setSelectedCourse: (course: string) => void;
    assignments: Assignment[];
    selectedAssignmentId: string;
    setSelectedAssignmentId: (assignmentId: string) => void;
    assignmentTitle: string;
    setAssignmentTitle: (value: string) => void;
    assignment: string;
    setAssignment: (value: string) => void;
    dueDate: string;
    setDueDate: (value: string) => void;
    isLoadingCourses: boolean;
    isLoadingAssignments: boolean;
    isCreatingAssignment: boolean;
    completingTaskKeys: string[];
    errorMessage: string | null;
    selectedAssignment: Assignment | null;
    visibleTasks: MicroTask[];
    handleCreateAssignment: () => Promise<void>;
    handleCompleteTask: (assignmentId: string, taskId: string, alreadyCompleted: boolean) => Promise<void>;
};

function normalizeAssignments(payload: unknown): Assignment[] {
    const asRecord = payload as Record<string, unknown>;
    const assignmentsRaw = asRecord?.assignments;

    if (!Array.isArray(assignmentsRaw)) {
        return [];
    }

    return assignmentsRaw.map((assignmentRaw, index) => {
        const assignmentRecord = assignmentRaw as Record<string, unknown>;
        const tasksRaw = assignmentRecord.tasks;

        const tasks = Array.isArray(tasksRaw)
            ? tasksRaw.map((taskRaw, taskIndex) => {
                const taskRecord = taskRaw as Record<string, unknown>;
                return {
                    id: typeof taskRecord.id === 'string'
                        ? taskRecord.id
                        : `${String(assignmentRecord.id ?? index)}-${taskIndex}`,
                    description: typeof taskRecord.task === 'string' ? taskRecord.task : 'Untitled task',
                    xp: Number.isFinite(Number(taskRecord.xp)) ? Number(taskRecord.xp) : 0,
                    completed: Boolean(taskRecord.completed),
                };
            })
            : [];

        return {
            id: String(assignmentRecord.id ?? index),
            title: typeof assignmentRecord.title === 'string' ? assignmentRecord.title : '',
            instructions: typeof assignmentRecord.instructions === 'string' ? assignmentRecord.instructions : '',
            tasks,
        };
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

export function useTaskManager(studentId: string | number | null, options?: UseTaskManagerOptions): UseTaskManagerResult {
    const [courses, setCourses] = useState<string[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignment, setAssignment] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
    const [completingTaskKeys, setCompletingTaskKeys] = useState<string[]>([]);
    const [reloadAssignmentsKey, setReloadAssignmentsKey] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const onTaskCompleted = options?.onTaskCompleted ?? (() => { });

    const selectedAssignment = assignments.find((currentAssignment) => currentAssignment.id === selectedAssignmentId) ?? null;
    const visibleTasks = selectedAssignment?.tasks ?? [];

    const markTaskCompletedLocally = (assignmentId: string, taskId: string) => {
        setAssignments((prev) => prev.map((currentAssignment) => {
            if (currentAssignment.id !== assignmentId) {
                return currentAssignment;
            }

            return {
                ...currentAssignment,
                tasks: currentAssignment.tasks.map((task) => (
                    task.id === taskId ? { ...task, completed: true } : task
                )),
            };
        }));
    };

    const handleCompleteTask = async (assignmentId: string, taskId: string, alreadyCompleted: boolean) => {
        if (alreadyCompleted || studentId == null || !selectedCourse) {
            return;
        }

        const taskKey = `${assignmentId}:${taskId}`;
        if (completingTaskKeys.includes(taskKey)) {
            return;
        }

        setCompletingTaskKeys((prev) => [...prev, taskKey]);
        setErrorMessage(null);

        try {
            const studentIdValue = String(studentId);
            const response = await fetch(
                `/api/tasks?student_id=${encodeURIComponent(studentIdValue)}&course_code=${encodeURIComponent(selectedCourse)}&assignment_id=${encodeURIComponent(assignmentId)}&task_id=${encodeURIComponent(taskId)}`,
                {
                    method: 'PATCH',
                }
            );

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error ?? 'Unable to complete task');
            }

            markTaskCompletedLocally(assignmentId, taskId);
            onTaskCompleted(1);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to complete task');
        } finally {
            setCompletingTaskKeys((prev) => prev.filter((key) => key !== taskKey));
        }
    };

    const handleCreateAssignment = async () => {
        if (studentId == null || !selectedCourse) {
            setErrorMessage('Select a course before creating an assignment.');
            return;
        }

        const title = assignmentTitle.trim();
        const instructions = assignment.trim();
        if (!title) {
            setErrorMessage('Enter an assignment title first.');
            return;
        }

        if (!instructions) {
            setErrorMessage('Paste assignment instructions first.');
            return;
        }

        setIsCreatingAssignment(true);
        setErrorMessage(null);

        try {
            const studentIdValue = String(studentId);
            const response = await fetch(
                `/api/tasks?student_id=${encodeURIComponent(studentIdValue)}&course_code=${encodeURIComponent(selectedCourse)}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title,
                        instructions,
                        due_date: dueDate || null,
                    }),
                }
            );

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error ?? 'Unable to create assignment');
            }

            setAssignmentTitle('');
            setAssignment('');
            setDueDate('');
            setReloadAssignmentsKey((prev) => prev + 1);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to create assignment');
        } finally {
            setIsCreatingAssignment(false);
        }
    };

    useEffect(() => {
        if (studentId == null) {
            setCourses([]);
            setSelectedCourse('');
            setAssignments([]);
            setSelectedAssignmentId('');
            setIsLoadingCourses(false);
            setIsLoadingAssignments(false);
            return;
        }

        const studentIdValue = String(studentId);
        setIsLoadingCourses(true);
        setErrorMessage(null);

        fetch(`/api/courses?student_id=${encodeURIComponent(studentIdValue)}`, {
            cache: 'no-store',
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data?.error ?? 'Unable to load courses');
                }

                const nextCourses = normalizeCourseCodes(data);

                setCourses(nextCourses);
                setSelectedCourse((currentCourse) => {
                    if (currentCourse && nextCourses.includes(currentCourse)) {
                        return currentCourse;
                    }
                    return nextCourses[0] ?? '';
                });
            })
            .catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : 'Unable to load courses');
                setCourses([]);
                setSelectedCourse('');
            })
            .finally(() => {
                setIsLoadingCourses(false);
            });
    }, [studentId]);

    useEffect(() => {
        if (studentId == null || !selectedCourse) {
            setAssignments([]);
            setSelectedAssignmentId('');
            return;
        }

        const studentIdValue = String(studentId);
        setIsLoadingAssignments(true);
        setErrorMessage(null);

        fetch(`/api/tasks?student_id=${encodeURIComponent(studentIdValue)}&course_code=${encodeURIComponent(selectedCourse)}`, {
            cache: 'no-store',
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data?.error ?? 'Unable to load assignments');
                }

                const normalizedAssignments = normalizeAssignments(data);

                setAssignments(normalizedAssignments);
                setSelectedAssignmentId((currentId) => {
                    if (currentId && normalizedAssignments.some((a) => a.id === currentId)) {
                        return currentId;
                    }
                    return normalizedAssignments[0]?.id ?? '';
                });
            })
            .catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : 'Unable to load assignments');
                setAssignments([]);
                setSelectedAssignmentId('');
            })
            .finally(() => {
                setIsLoadingAssignments(false);
            });
    }, [reloadAssignmentsKey, selectedCourse, studentId]);

    return {
        courses,
        selectedCourse,
        setSelectedCourse,
        assignments,
        selectedAssignmentId,
        setSelectedAssignmentId,
        assignmentTitle,
        setAssignmentTitle,
        assignment,
        setAssignment,
        dueDate,
        setDueDate,
        isLoadingCourses,
        isLoadingAssignments,
        isCreatingAssignment,
        completingTaskKeys,
        errorMessage,
        selectedAssignment,
        visibleTasks,
        handleCreateAssignment,
        handleCompleteTask,
    };
}
