"use client";
import { useMemo, useState } from 'react';
import { ListTodo } from 'lucide-react';
import XpBanner from '@components/XpBanner';
import { useSessionStore } from '@lib/sessionStore';
import { useTaskSummary } from '@hooks/useTaskSummary';
import { useTaskManager } from '@hooks/useTaskManager';
import TaskCourseSelect from '@components/TaskCourseSelect';
import TaskAssignmentComposer from '@components/TaskAssignmentComposer';
import TaskAssignmentEditModal from '@components/TaskAssignmentEditModal';
import TaskAssignmentList from '@components/TaskAssignmentList';
import TaskItem from '@components/TaskItem';
import SectionHeader from '@components/SectionHeader';

type TaskManagerProps = {
    initialCourseCode?: string;
    initialAssignmentId?: string;
};

export default function TaskManager({ initialCourseCode, initialAssignmentId }: TaskManagerProps) {
    const studentId = useSessionStore((snapshot) => snapshot.studentId);
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
    const [editingAssignmentTitle, setEditingAssignmentTitle] = useState('');
    const [editingAssignmentDueDate, setEditingAssignmentDueDate] = useState('');
    const { completedCount, totalCount, totalXp, level, incrementCompleted } = useTaskSummary(studentId);
    const {
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
    } = useTaskManager(studentId, {
        onTaskCompleted: incrementCompleted,
        initialCourseCode,
        initialAssignmentId,
    });

    const editingAssignment = useMemo(
        () => assignments.find((assignmentItem) => assignmentItem.id === editingAssignmentId) ?? null,
        [assignments, editingAssignmentId]
    );

    const openAssignmentEditModal = (assignmentId: string) => {
        const assignmentToEdit = assignments.find((assignmentItem) => assignmentItem.id === assignmentId);
        if (!assignmentToEdit) {
            return;
        }

        setEditingAssignmentId(assignmentId);
        setEditingAssignmentTitle(assignmentToEdit.title?.trim() ?? '');
        setEditingAssignmentDueDate(assignmentToEdit.dueDate ?? '');
    };

    const closeAssignmentEditModal = () => {
        if (isUpdatingAssignment) {
            return;
        }

        setEditingAssignmentId(null);
        setEditingAssignmentTitle('');
        setEditingAssignmentDueDate('');
    };

    const submitAssignmentEdit = async () => {
        if (!editingAssignmentId) {
            return;
        }

        const updated = await handleUpdateAssignment(editingAssignmentId, editingAssignmentTitle, editingAssignmentDueDate);
        if (updated) {
            closeAssignmentEditModal();
        }
    };

    return (
        <>
            <header className="mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                    <ListTodo className="text-cyan-400 w-8 h-8" />
                    Task Manager
                </h1>
                <p className="text-gray-400 text-sm mt-1">Break down overwhelming assignments.</p>
            </header>

            <XpBanner level={level} xp={totalXp} completed={completedCount} total={totalCount} />

            <TaskCourseSelect
                courses={courses}
                selectedCourse={selectedCourse}
                onSelectedCourseChange={setSelectedCourse}
                isLoading={isLoadingCourses}
            />

            <TaskAssignmentComposer
                assignmentTitle={assignmentTitle}
                onAssignmentTitleChange={setAssignmentTitle}
                assignment={assignment}
                onAssignmentChange={setAssignment}
                dueDate={dueDate}
                onDueDateChange={setDueDate}
                onSubmit={handleCreateAssignment}
                isCreatingAssignment={isCreatingAssignment}
                canSubmit={Boolean(selectedCourse && assignmentTitle.trim() && assignment.trim())}
            />

            <TaskAssignmentEditModal
                isOpen={Boolean(editingAssignment)}
                assignmentTitle={editingAssignmentTitle}
                dueDate={editingAssignmentDueDate}
                isSaving={isUpdatingAssignment}
                error={errorMessage}
                onAssignmentTitleChange={setEditingAssignmentTitle}
                onDueDateChange={setEditingAssignmentDueDate}
                onClose={closeAssignmentEditModal}
                onSubmit={() => void submitAssignmentEdit()}
            />

            <TaskAssignmentList
                assignments={assignments}
                selectedAssignmentId={selectedAssignmentId}
                onSelectAssignment={setSelectedAssignmentId}
                onEditAssignment={openAssignmentEditModal}
                onDeleteAssignment={(assignmentId) => void handleDeleteAssignment(assignmentId)}
                deletingAssignmentId={deletingAssignmentId}
                isLoadingAssignments={isLoadingAssignments}
                selectedCourse={selectedCourse}
            />

            <section>
                <SectionHeader title="Micro-Tasks" />
                {errorMessage && <p className="text-sm text-red-300 px-2 mb-3">{errorMessage}</p>}
                <div className="flex flex-col gap-3">
                    {visibleTasks.map((task) => {
                        const taskKey = selectedAssignment ? `${selectedAssignment.id}:${task.id}` : task.id;
                        const isCompleting = completingTaskKeys.includes(taskKey);

                        return (
                            <TaskItem
                                key={task.id}
                                task={task}
                                isCompleting={isCompleting}
                                onClick={() => selectedAssignment && void handleCompleteTask(selectedAssignment.id, task.id, task.completed)}
                            />
                        );
                    })}

                    {!selectedAssignment && !isLoadingAssignments && (
                        <p className="text-sm text-gray-400 px-2">Choose an assignment to view its micro-tasks.</p>
                    )}
                </div>
            </section>
        </>
    );
}
