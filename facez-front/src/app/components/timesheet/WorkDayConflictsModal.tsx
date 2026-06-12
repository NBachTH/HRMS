"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/app/components/common/Modal';
import { getWorkDayConflicts, resolveWorkDayConflict } from '@/app/services/WorkDayService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { WorkDay } from '@/app/commons/types';

interface Props {
    isOpen: boolean;
    year: number;
    month: number;
    onClose: () => void;
    onResolved?: () => void;
}

export function WorkDayConflictsModal({ isOpen, year, month, onClose, onResolved }: Props) {
    const { showToast } = useToast();
    const [conflicts, setConflicts] = useState<WorkDay[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getWorkDayConflicts(year, month);
            setConflicts(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load conflicts', 'error');
        } finally {
            setLoading(false);
        }
    }, [year, month, showToast]);

    useEffect(() => { if (isOpen) fetchData(); }, [isOpen, fetchData]);

    const resolve = async (id: string, source: 'CHECKIN' | 'LEAVE_REQUEST') => {
        setBusyId(id);
        try {
            await resolveWorkDayConflict(id, source);
            showToast('Conflict resolved');
            setConflicts(cs => cs.filter(c => c.id !== id));
            onResolved?.();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to resolve', 'error');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}
            title={`Reconcile conflicts · ${String(month).padStart(2, '0')}/${year}`} width="max-w-2xl">
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 mb-4">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" />
                Days where the employee both checked in and had approved leave. Choose which one wins
                before closing the period.
            </div>

            {loading ? (
                <div className="py-8 text-center text-gray-500">Loading…</div>
            ) : conflicts.length === 0 ? (
                <div className="py-8 text-center text-green-600">No conflicts — ready to close.</div>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-3 py-2 text-left">Employee</th>
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Leave</th>
                                <th className="px-3 py-2 text-right">Resolve</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {conflicts.map(c => (
                                <tr key={c.id}>
                                    <td className="px-3 py-2 text-gray-800">{c.employeeName || c.employeeId}</td>
                                    <td className="px-3 py-2 text-gray-700">{c.workDate}</td>
                                    <td className="px-3 py-2 text-gray-600">{c.leaveType ?? '—'}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                        <button disabled={busyId === c.id}
                                            onClick={() => resolve(c.id, 'CHECKIN')}
                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                            Keep Check-in
                                        </button>
                                        <button disabled={busyId === c.id}
                                            onClick={() => resolve(c.id, 'LEAVE_REQUEST')}
                                            className="ml-2 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
                                            Keep Leave
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                    Close
                </button>
            </div>
        </Modal>
    );
}
