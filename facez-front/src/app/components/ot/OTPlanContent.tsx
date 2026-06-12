"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getOTPlans } from '@/app/services/OTPlanService';
import { OTPlanFormModal } from './OTPlanFormModal';
import { OTPlanDetailModal } from './OTPlanDetailModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { formatDate } from '@/app/commons/utils/formatters';
import type { OTPlan } from '@/app/commons/types';

const STATUS_TABS = [
    { value: null, label: 'All' },
    { value: 'TO_APPROVE', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
];

const hhmm = (t?: string) => (t ? t.slice(0, 5) : '—');

export function OTPlanContent() {
    const { showToast } = useToast();
    const { role } = useAuth();
    const [plans, setPlans] = useState<OTPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [status, setStatus] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState<OTPlan | null>(null);

    const canCreate = role === 'LEADER' || role === 'HR_ADMIN';

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getOTPlans(status, page, 20);
            if (res.success && res.data) {
                setPlans(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load OT plans');
        } finally {
            setLoading(false);
        }
    }, [status, page]);

    useEffect(() => { setPage(0); }, [status]);
    useEffect(() => { fetchData(); }, [fetchData]);

    const statusBadge = (s: string) => {
        const styles: Record<string, string> = {
            TO_APPROVE: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${styles[s] || 'bg-gray-100 text-gray-600'}`}>
                {s?.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">OT Plans</h1>
                    <p className="text-sm text-gray-500">Manager / OT Plans</p>
                </div>
                {canCreate && (
                    <button onClick={() => setShowCreate(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        New OT Plan
                    </button>
                )}
            </div>

            <div className="mb-4 flex gap-2">
                {STATUS_TABS.map(t => (
                    <button key={t.label} onClick={() => setStatus(t.value)}
                        className={`px-4 py-1.5 text-sm rounded-full border ${status === t.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">OT Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Window</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {plans.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No OT plans</td></tr>
                                    ) : plans.map((p, i) => (
                                        <tr key={p.id} onClick={() => setSelected(p)}
                                            className="hover:bg-blue-50/50 cursor-pointer">
                                            <td className="px-6 py-4 text-sm text-gray-900">{i + 1 + page * 20}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatDate(p.otDate)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{hhmm(p.plannedStartTime)} – {hhmm(p.plannedEndTime)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{p.employees?.length ?? 0}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{p.reason || '—'}</td>
                                            <td className="px-6 py-4">{statusBadge(p.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded-md disabled:opacity-40">Previous</button>
                                <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
                                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded-md disabled:opacity-40">Next</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <OTPlanFormModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={fetchData}
            />

            <OTPlanDetailModal
                plan={selected}
                onClose={() => setSelected(null)}
                onChanged={fetchData}
            />
        </div>
    );
}
