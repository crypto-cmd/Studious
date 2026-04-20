'use client';

import { X } from 'lucide-react';
import type { Course } from '@hooks/useCourses';

type CourseFormModalProps = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    course?: Course | null;
    formState: {
        code: string;
        title: string;
        finalExamDate: string;
    };
    onFormChange: (field: 'code' | 'title' | 'finalExamDate', value: string) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
    error?: string | null;
    isLoading?: boolean;
};

export default function CourseFormModal({
    isOpen,
    mode,
    formState,
    onFormChange,
    onSubmit,
    onClose,
    error,
    isLoading = false,
}: CourseFormModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#1b3f3a] bg-[#132e2a] p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">
                        {mode === 'add' ? 'Add Course' : 'Edit Course'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-lg border border-[#1b3f3a] bg-[#091f1c] p-2 text-gray-300 hover:text-white disabled:opacity-50"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-gray-300">Course Code</span>
                        <input
                            type="text"
                            value={formState.code}
                            onChange={(e) => onFormChange('code', e.target.value)}
                            placeholder="MATH-101"
                            className="rounded-lg border border-[#1b3f3a] bg-[#091f1c] px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                            required
                            disabled={isLoading}
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-gray-300">Course Title</span>
                        <input
                            type="text"
                            value={formState.title}
                            onChange={(e) => onFormChange('title', e.target.value)}
                            placeholder="Linear Algebra"
                            className="rounded-lg border border-[#1b3f3a] bg-[#091f1c] px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                            disabled={isLoading}
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-gray-300">Final Exam Date</span>
                        <input
                            type="date"
                            value={formState.finalExamDate}
                            onChange={(e) => onFormChange('finalExamDate', e.target.value)}
                            className="rounded-lg border border-[#1b3f3a] bg-[#091f1c] px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                            disabled={isLoading}
                        />
                    </label>

                    {error && <p className="text-sm text-red-300">{error}</p>}

                    <div className="mt-2 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="rounded-lg border border-[#34514c] px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-[#0d2522] disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-[#091f1c] transition-colors hover:bg-cyan-400 disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : mode === 'add' ? 'Add Course' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
