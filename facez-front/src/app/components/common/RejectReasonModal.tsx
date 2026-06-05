"use client";
import React, { useState } from 'react';
import { Modal } from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title?: string;
    loading?: boolean;
}

export function RejectReasonModal({ isOpen, onClose, onConfirm, title = 'Reject', loading = false }: Props) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) { setError('Reason is required'); return; }
        onConfirm(reason.trim());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} width="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        rows={4}
                        value={reason}
                        onChange={e => { setReason(e.target.value); setError(''); }}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none ${error ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Explain the reason for rejection…"
                    />
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose} disabled={loading}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                        {loading ? 'Rejecting…' : 'Reject'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
