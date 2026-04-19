type TaskAssignmentComposerProps = {
    assignmentTitle: string;
    onAssignmentTitleChange: (value: string) => void;
    assignment: string;
    onAssignmentChange: (value: string) => void;
    dueDate: string;
    onDueDateChange: (value: string) => void;
    onSubmit: () => void;
    isCreatingAssignment: boolean;
    canSubmit: boolean;
};

export default function TaskAssignmentComposer({
    assignmentTitle,
    onAssignmentTitleChange,
    assignment,
    onAssignmentChange,
    dueDate,
    onDueDateChange,
    onSubmit,
    isCreatingAssignment,
    canSubmit,
}: TaskAssignmentComposerProps) {
    return (
        <section className="bg-[#132e2a] rounded-3xl p-5 mb-6 border border-[#1b3f3a] shadow-lg">
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Assignment Title</label>
                <input
                    type="text"
                    value={assignmentTitle}
                    onChange={(event) => onAssignmentTitleChange(event.target.value)}
                    placeholder="e.g. Slavery in Jamaica Research Report"
                    className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Paste Assignment</label>
                <textarea
                    value={assignment}
                    onChange={(event) => onAssignmentChange(event.target.value)}
                    placeholder="Example: 'Write a report on the current effects of slavery in Jamaica, making reference to textbook Chapters 3 - 5'"
                    className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm min-h-[100px] resize-none"
                />
            </div>

            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Due Date</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(event) => onDueDateChange(event.target.value)}
                        className="w-full bg-[#0a1816] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm [color-scheme:dark]"
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || isCreatingAssignment}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700/50 disabled:text-gray-300 disabled:cursor-not-allowed text-[#091f1c] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
                {isCreatingAssignment ? 'Creating...' : 'Break It Down 🧩'}
            </button>
        </section>
    );
}
