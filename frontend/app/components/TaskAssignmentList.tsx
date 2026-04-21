import SectionHeader from './SectionHeader';
import { Pencil, Trash2 } from 'lucide-react';
import { formatDueDateLabel, type Assignment } from '@lib/assignments';

type TaskAssignmentListProps = {
    assignments: Assignment[];
    selectedAssignmentId: string;
    onSelectAssignment: (assignmentId: string) => void;
    onEditAssignment: (assignmentId: string) => void;
    onDeleteAssignment: (assignmentId: string) => void;
    deletingAssignmentId: string | null;
    isLoadingAssignments: boolean;
    selectedCourse: string;
};

export default function TaskAssignmentList({
    assignments,
    selectedAssignmentId,
    onSelectAssignment,
    onEditAssignment,
    onDeleteAssignment,
    deletingAssignmentId,
    isLoadingAssignments,
    selectedCourse,
}: TaskAssignmentListProps) {
    return (
        <section>
            <SectionHeader title="Assignments" />
            <div className="flex flex-col gap-3 mb-6">
                {isLoadingAssignments && (
                    <p className="text-sm text-gray-400 px-2">Loading assignments...</p>
                )}

                {!isLoadingAssignments && assignments.length === 0 && (
                    <p className="text-sm text-gray-400 px-2">
                        {selectedCourse ? `No assignments found for ${selectedCourse}.` : 'Select a course to view assignments.'}
                    </p>
                )}

                {assignments.map((assignmentItem, index) => {
                    const isSelected = assignmentItem.id === selectedAssignmentId;
                    const isDeleting = deletingAssignmentId === assignmentItem.id;
                    const titleText = assignmentItem.title?.trim() || assignmentItem.instructions?.trim() || `Assignment ${index + 1}`;

                    return (
                        <div
                            key={assignmentItem.id}
                            onClick={() => onSelectAssignment(assignmentItem.id)}
                            className={`w-full text-left bg-[#132e2a] rounded-2xl p-4 border transition-all ${isSelected
                                ? 'border-cyan-400/70'
                                : 'border-[#1b3f3a] hover:border-cyan-400/40'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-white line-clamp-2 pr-2">{titleText}</p>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        aria-label={`Edit ${titleText}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onEditAssignment(assignmentItem.id);
                                        }}
                                        disabled={isDeleting}
                                        className="w-8 h-8 rounded-lg border border-[#1b3f3a] bg-[#091f1c] text-gray-300 hover:text-cyan-300 hover:border-cyan-400/50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>

                                    <button
                                        type="button"
                                        aria-label={`Delete ${titleText}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onDeleteAssignment(assignmentItem.id);
                                        }}
                                        disabled={isDeleting}
                                        className="w-8 h-8 rounded-lg border border-[#4a1f1f] bg-[#2a1212] text-red-300 hover:text-red-200 hover:border-red-400/70 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 mt-2">
                                {assignmentItem.tasks.length} micro-tasks{assignmentItem.dueDate ? ` · due ${formatDueDateLabel(assignmentItem.dueDate)}` : ''}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
