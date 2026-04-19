import SectionHeader from './SectionHeader';

type Assignment = {
    id: string;
    title?: string;
    instructions?: string;
    tasks: Array<{
        id: string;
        description: string;
        xp: number;
        completed: boolean;
    }>;
};

type TaskAssignmentListProps = {
    assignments: Assignment[];
    selectedAssignmentId: string;
    onSelectAssignment: (assignmentId: string) => void;
    isLoadingAssignments: boolean;
    selectedCourse: string;
};

export default function TaskAssignmentList({
    assignments,
    selectedAssignmentId,
    onSelectAssignment,
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
                    const titleText = assignmentItem.title?.trim() || assignmentItem.instructions?.trim() || `Assignment ${index + 1}`;

                    return (
                        <button
                            key={assignmentItem.id}
                            type="button"
                            onClick={() => onSelectAssignment(assignmentItem.id)}
                            className={`w-full text-left bg-[#132e2a] rounded-2xl p-4 border transition-all ${isSelected
                                ? 'border-cyan-400/70'
                                : 'border-[#1b3f3a] hover:border-cyan-400/40'
                                }`}
                        >
                            <p className="text-sm text-white line-clamp-2">{titleText}</p>
                            <p className="text-xs text-gray-400 mt-2">{assignmentItem.tasks.length} micro-tasks</p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
