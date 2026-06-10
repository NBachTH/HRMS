"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getLeaves, deleteLeave } from '@/app/services/LeaveService';
import { LeaveDetailModal } from '@/app/components/leave/LeaveDetailModal';
import type { LeaveRequest } from '@/app/commons/types';

export function LeaveTable({ refreshKey }: { refreshKey?: number }) {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [selected, setSelected] = useState<LeaveRequest | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getLeaves(page, 20);
            if (res.success && res.data) {
                setLeaves(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load leave requests');
        } finally {
            setLoading(false);
        }
    }, [page, refreshKey]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this leave request?')) return;
        try {
            await deleteLeave(id);
            fetchData();
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to delete');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT:            'bg-gray-100 text-gray-600',
            TO_APPROVE:       'bg-yellow-100 text-yellow-800',
            LEADER_APPROVED:  'bg-blue-100 text-blue-800',
            MANAGER_APPROVED: 'bg-purple-100 text-purple-800',
            APPROVED:         'bg-green-100 text-green-800',
            REJECTED:         'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
                {status?.replace(/_/g, ' ')}
            </span>
        );
    };

    if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {leaves.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No leave requests</td></tr>
                        ) : leaves.map((lr, i) => (
                            <tr key={lr.leaveRequestId} onClick={() => setSelected(lr)}
                                className="hover:bg-blue-50/50 cursor-pointer">
                                <td className="px-6 py-4 text-sm text-gray-900">{i + 1 + page * 20}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{lr.employeeName || lr.employeeId}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{lr.reason}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{lr.startTime ? new Date(lr.startTime).toLocaleDateString() : '—'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{lr.endTime ? new Date(lr.endTime).toLocaleDateString() : '—'}</td>
                                <td className="px-6 py-4 text-sm">{getStatusBadge(lr.status)}</td>
                                <td className="px-6 py-4 text-sm">
                                    {(lr.status === 'TO_APPROVE' || lr.status === 'DRAFT') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(lr.leaveRequestId); }}
                                            className="text-red-500 hover:text-red-700 text-xs">
                                            Cancel
                                        </button>
                                    )}
                                </td>
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

            <LeaveDetailModal
                leave={selected}
                onClose={() => setSelected(null)}
                onChanged={fetchData}
            />
        </>
    );
}
