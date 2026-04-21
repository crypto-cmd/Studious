import { useEffect, useState } from 'react';
import { useApi } from '@hooks/useApi';
import {
    normalizeAssignments,
    type Assignment,
    type AssignmentTask as MicroTask,
} from '@lib/assignments';

type UseTaskManagerOptions = {
    onTaskCompleted?: (delta: number) => void;
    initialCourseCode?: string;
    initialAssignmentId?: string;
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
    isUpdatingAssignment: boolean;
    deletingAssignmentId: string | null;
    completingTaskKeys: string[];
    errorMessage: string | null;
    selectedAssignment: Assignment | null;
    visibleTasks: MicroTask[];
    handleCreateAssignment: () => Promise<void>;
    handleUpdateAssignment: (assignmentId: string, nextTitle: string, nextDueDate: string) => Promise<boolean>;
    handleDeleteAssignment: (assignmentId: string) => Promise<void>;
    handleCompleteTask: (assignmentId: string, taskId: string, alreadyCompleted: boolean) => Promise<void>;
};

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
    const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
    const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
    const [completingTaskKeys, setCompletingTaskKeys] = useState<string[]>([]);
    const [reloadAssignmentsKey, setReloadAssignmentsKey] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const onTaskCompleted = options?.onTaskCompleted ?? (() => { });
    const initialCourseCode = options?.initialCourseCode?.trim() ?? '';
    const initialAssignmentId = options?.initialAssignmentId?.trim() ?? '';

    const selectedAssignment = assignments.find((currentAssignment) => currentAssignment.id === selectedAssignmentId) ?? null;
    const visibleTasks = selectedAssignment?.tasks ?? [];

    const resetComposerState = () => {
        setAssignmentTitle('');
        setAssignment('');
        setDueDate('');
    };

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
            await useApi(
                'tasks',
                'PATCH',
                {
                    student_id: String(studentId),
                    course_code: selectedCourse,
                    assignment_id: assignmentId,
                    task_id: taskId,
                },
                {},
                {},
                'Unable to complete task'
            );

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
            await useApi(
                'tasks',
                'POST',
                { student_id: String(studentId), course_code: selectedCourse },
                {
                    title,
                    instructions,
                    due_date: dueDate || null,
                },
                {},
                'Unable to create assignment'
            );

            resetComposerState();
            setReloadAssignmentsKey((prev) => prev + 1);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to create assignment');
        } finally {
            setIsCreatingAssignment(false);
        }
    };

    const handleUpdateAssignment = async (assignmentId: string, nextTitle: string, nextDueDate: string) => {
        if (studentId == null || !selectedCourse) {
            setErrorMessage('Select a course before editing an assignment.');
            return false;
        }

        const title = nextTitle.trim();
        if (!title) {
            setErrorMessage('Enter an assignment title first.');
            return false;
        }

        setIsUpdatingAssignment(true);
        setErrorMessage(null);

        try {
            await useApi(
                'tasks',
                'PUT',
                {
                    student_id: String(studentId),
                    course_code: selectedCourse,
                    assignment_id: assignmentId,
                },
                {
                    title,
                    due_date: nextDueDate || null,
                },
                {},
                'Unable to update assignment'
            );

            setReloadAssignmentsKey((prev) => prev + 1);
            return true;
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to update assignment');
            return false;
        } finally {
            setIsUpdatingAssignment(false);
        }
    };

    const handleDeleteAssignment = async (assignmentId: string) => {
        if (studentId == null || !selectedCourse) {
            setErrorMessage('Select a course before deleting an assignment.');
            return;
        }

        const assignmentToDelete = assignments.find((currentAssignment) => currentAssignment.id === assignmentId);
        const assignmentLabel = assignmentToDelete?.title?.trim() || `Assignment ${assignmentId}`;
        const shouldDelete = window.confirm(`Delete ${assignmentLabel}? This action cannot be undone.`);
        if (!shouldDelete) {
            return;
        }

        setDeletingAssignmentId(assignmentId);
        setErrorMessage(null);

        try {
            await useApi(
                'tasks',
                'DELETE',
                {
                    student_id: String(studentId),
                    course_code: selectedCourse,
                    assignment_id: assignmentId,
                },
                {},
                {},
                'Unable to delete assignment'
            );

            setReloadAssignmentsKey((prev) => prev + 1);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to delete assignment');
        } finally {
            setDeletingAssignmentId(null);
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

        useApi(
            'courses',
            'GET',
            { student_id: studentIdValue },
            {},
            { cache: 'no-store' },
            'Unable to load courses'
        )
            .then((data) => {
                const nextCourses = normalizeCourseCodes(data);

                setCourses(nextCourses);
                setSelectedCourse((currentCourse) => {
                    if (initialCourseCode && nextCourses.includes(initialCourseCode)) {
                        return initialCourseCode;
                    }

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
    }, [initialCourseCode, studentId]);

    useEffect(() => {
        if (studentId == null || !selectedCourse) {
            setAssignments([]);
            setSelectedAssignmentId('');
            return;
        }

        const studentIdValue = String(studentId);
        setIsLoadingAssignments(true);
        setErrorMessage(null);

        useApi(
            'tasks',
            'GET',
            { student_id: studentIdValue, course_code: selectedCourse },
            {},
            { cache: 'no-store' },
            'Unable to load assignments'
        )
            .then((data) => {
                const normalizedAssignments = normalizeAssignments(data);

                setAssignments(normalizedAssignments);
                setSelectedAssignmentId((currentId) => {
                    if (initialAssignmentId && normalizedAssignments.some((assignmentItem) => assignmentItem.id === initialAssignmentId)) {
                        return initialAssignmentId;
                    }

                    if (currentId && normalizedAssignments.some((assignmentItem) => assignmentItem.id === currentId)) {
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
    }, [initialAssignmentId, reloadAssignmentsKey, selectedCourse, studentId]);

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
        isUpdatingAssignment,
        deletingAssignmentId,
        completingTaskKeys,
        errorMessage,
        selectedAssignment,
        visibleTasks,
        handleCreateAssignment,
        handleUpdateAssignment,
        handleDeleteAssignment,
        handleCompleteTask,
    };
}
