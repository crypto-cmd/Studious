'use client';

import { X } from 'lucide-react';
import { formatDueDateLabel, type Assignment } from '@lib/assignments';

type AssignmentDueModalProps = {
    isOpen: boolean;
    dueDate: string | null;
    assignments: Assignment[];
    exams: Array<{
        courseCode: string;
        courseTitle: string | null;
    }>;
    onClose: () => void;
    onSelectAssignment: (assignment: Assignment) => void;
};

export default function AssignmentDueModal({
    isOpen,
    dueDate,
    assignments,
    exams,
    onClose,
    onSelectAssignment,
}: AssignmentDueModalProps) {
    if (!isOpen) {
        return null;
    }

    const totalEvents = assignments.length + exams.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-3xl border border-[#1b3f3a] bg-[#132e2a] shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-[#1b3f3a] px-5 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">Due Date</p>
                        <h2 className="mt-2 text-2xl font-bold text-white">{formatDueDateLabel(dueDate)}</h2>
                        <p className="mt-1 text-sm text-gray-400">{totalEvents} event{totalEvents === 1 ? '' : 's'} due</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[#1b3f3a] bg-[#091f1c] p-2 text-gray-300 transition-colors hover:text-white"
                        aria-label="Close assignment list"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4">
                    <div className="flex flex-col gap-3">
                        {exams.map((exam) => (
                            <div
                                key={`exam-${exam.courseCode}`}
                                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-300/30 bg-[#0d2522] px-4 py-3 text-left"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">
                                        {exam.courseTitle?.trim() || exam.courseCode} Final Exam
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">{exam.courseCode}</p>
                                </div>
                                <span className="flex-shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                                    Exam
                                </span>
                            </div>
                        ))}

                        {assignments.map((assignment, index) => {
                            const titleText = assignment.title?.trim() || assignment.instructions?.trim() || `Assignment ${index + 1}`;

                            return (
                                <button
                                    key={assignment.id}
                                    type="button"
                                    onClick={() => onSelectAssignment(assignment)}
                                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#1b3f3a] bg-[#0d2522] px-4 py-3 text-left transition-colors hover:border-red-400/50 hover:bg-[#102c28]"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">{titleText}</p>
                                        <p className="mt-1 text-xs text-gray-400">
                                            {assignment.courseCode || 'Unknown course'}
                                            {assignment.tasks.length > 0 ? ` · ${assignment.tasks.length} micro-tasks` : ''}
                                        </p>
                                    </div>
                                    <span className="flex-shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                                        Open
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
