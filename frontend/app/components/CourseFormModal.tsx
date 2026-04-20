'use client';

import { useState } from 'react';
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
    onUploadMaterial?: (file: File) => Promise<void>;
    isUploadingMaterial?: boolean;
    uploadStatusMessage?: string | null;
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
    onUploadMaterial,
    isUploadingMaterial = false,
    uploadStatusMessage,
    error,
    isLoading = false,
}: CourseFormModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    if (!isOpen) {
        return null;
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null;

        if (!nextFile) {
            setSelectedFile(null);
            setFileError(null);
            return;
        }

        const isPdfMime = nextFile.type === 'application/pdf';
        const hasPdfExtension = nextFile.name.toLowerCase().endsWith('.pdf');

        if (!isPdfMime && !hasPdfExtension) {
            setSelectedFile(null);
            setFileError('Only PDF files are supported.');
            return;
        }

        setSelectedFile(nextFile);
        setFileError(null);
    };

    const handleUploadClick = async () => {
        if (!selectedFile || !onUploadMaterial) {
            return;
        }

        setFileError(null);

        try {
            await onUploadMaterial(selectedFile);
            setSelectedFile(null);
        } catch (uploadError) {
            setFileError(uploadError instanceof Error ? uploadError.message : 'Unable to upload PDF.');
        }
    };

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

                    {mode === 'edit' && onUploadMaterial && (
                        <div className="rounded-xl border border-[#1b3f3a] bg-[#0d2522] p-3">
                            <p className="text-sm font-semibold text-gray-200 mb-2">Course Material (PDF)</p>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={handleFileChange}
                                    disabled={isLoading || isUploadingMaterial}
                                    className="block w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border file:border-[#1b3f3a] file:bg-[#091f1c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-300 hover:file:border-cyan-400/50 disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    disabled={!selectedFile || isLoading || isUploadingMaterial}
                                    className="self-start rounded-lg border border-cyan-500/60 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
                                >
                                    {isUploadingMaterial ? 'Uploading PDF...' : 'Upload PDF'}
                                </button>
                                {uploadStatusMessage && <p className="text-xs text-cyan-300">{uploadStatusMessage}</p>}
                                {fileError && <p className="text-xs text-red-300">{fileError}</p>}
                            </div>
                        </div>
                    )}

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
