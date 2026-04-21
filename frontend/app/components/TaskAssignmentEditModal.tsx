'use client';

import { X } from 'lucide-react';

type TaskAssignmentEditModalProps = {
    isOpen: boolean;
    assignmentTitle: string;
    dueDate: string;
    isSaving: boolean;
    error?: string | null;
    onAssignmentTitleChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
};

export default function TaskAssignmentEditModal({
    isOpen,
    assignmentTitle,
    dueDate,
    isSaving,
    error,
    onAssignmentTitleChange,
    onDueDateChange,
    onClose,
    onSubmit,
}: TaskAssignmentEditModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#1b3f3a] bg-[#132e2a] p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Edit Assignment</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-lg border border-[#1b3f3a] bg-[#091f1c] p-2 text-gray-300 hover:text-white disabled:opacity-50"
                        aria-label="Close edit assignment modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Assignment Title</label>
                    <input
                        type="text"
                        value={assignmentTitle}
                        onChange={(event) => onAssignmentTitleChange(event.target.value)}
                        className="w-full bg-[#0a1816] text-white rounded-xl p-3 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400"
                        disabled={isSaving}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Due Date</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(event) => onDueDateChange(event.target.value)}
                        className="w-full bg-[#0a1816] text-white rounded-xl p-2.5 border border-[#1b3f3a] focus:outline-none focus:border-cyan-400 text-sm [color-scheme:dark]"
                        disabled={isSaving}
                    />
                </div>

                <p className="mb-4 text-xs text-gray-400">
                    Instructions are locked and cannot be edited.
                </p>

                {error && <p className="text-sm text-red-300 mb-3">{error}</p>}

                <div className="mt-2 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-lg border border-[#34514c] px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-[#0d2522] disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSaving || !assignmentTitle.trim()}
                        className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-[#091f1c] transition-colors hover:bg-cyan-400 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
