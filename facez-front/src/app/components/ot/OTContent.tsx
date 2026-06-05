"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getOTRequests, deleteOTRequest } from '@/app/services/OTRequestService';
import { OTFormModal } from './OTFormModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { OTRequest } from '@/app/commons/types';

export function OTContent() {
    const { showToast } = useToast();
    const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [showCreate, setShowCreate] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getOTRequests(page, 20);
            if (res.success && res.data) {
                setOtRequests(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load OT requests');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string) => {
        try {
            await deleteOTRequest(id);
            showToast('OT request deleted');
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
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

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">OT Requests</h1>
                    <p className="text-sm text-gray-500">Personal / OT Requests</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    New OT Request
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">My OT Requests</h2>
                </div>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {otRequests.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No OT requests</td></tr>
                                    ) : otRequests.map((ot, i) => (
                                        <tr key={ot.otRequestId} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{i + 1 + page * 20}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{ot.startTime ? new Date(ot.startTime).toLocaleString() : '—'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{ot.endTime ? new Date(ot.endTime).toLocaleString() : '—'}</td>
                                            <td className="px-6 py-4">{getStatusBadge(ot.status)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{ot.createdAt ? new Date(ot.createdAt).toLocaleDateString() : '—'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                {(ot.status === 'TO_APPROVE' || ot.status === 'DRAFT') && (
                                                    <button
                                                        onClick={() => setDeleteConfirm(ot.otRequestId)}
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
                    </>
                )}
            </div>

            <OTFormModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={fetchData}
            />

            {/* Delete confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete OT Request</h3>
                        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this OT request?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
