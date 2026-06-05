"use client";
import React from 'react';
import { AlertTriangleIcon } from 'lucide-react';

interface Props {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    danger?: boolean;
    loading?: boolean;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false, loading = false }: Props) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
                <div className="flex items-start gap-3 mb-4">
                    {danger && <AlertTriangleIcon className="w-6 h-6 text-red-500 flex-none mt-0.5" />}
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Processing…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
