"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { getMyAdjustments, deleteAdjustment } from '@/app/services/AttendanceAdjustmentService';
import { AttendanceAdjustmentModal } from './AttendanceAdjustmentModal';
import { Pagination } from '@/app/components/common/Pagination';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { formatDateTime } from '@/app/commons/utils/formatters';
import type { AttendanceAdjustment } from '@/app/commons/types';

const badge = (s: string) => ({
    TO_APPROVE: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
} as Record<string, string>)[s] || 'bg-gray-100 text-gray-600';

export function MyAdjustmentsContent() {
    const { showToast } = useToast();
    const [rows, setRows] = useState<AttendanceAdjustment[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [cancelId, setCancelId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMyAdjustments(page, 20);
            const data: any = res.data;
            setRows(data?.content ?? (Array.isArray(data) ? data : []));
            setTotalPages(data?.totalPages ?? 1);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được danh sách', 'error');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [page, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const doCancel = async () => {
        if (!cancelId) return;
        try {
            await deleteAdjustment(cancelId);
            showToast('Đã hủy đơn');
            setCancelId(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Hủy thất bại', 'error');
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1">My Attendance Adjustments</h1>
                    <p className="text-sm text-gray-500">Đơn bổ sung / chỉnh giờ chấm công của bạn</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <CalendarPlus className="w-4 h-4" /> Bổ sung chấm công
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Đang tải…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Ngày', 'Giờ vào', 'Giờ ra', 'Lý do', 'Trạng thái', ''].map(h =>
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {rows.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chưa có đơn nào</td></tr>
                                ) : rows.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.workDate}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.requestedCheckIn ? formatDateTime(a.requestedCheckIn) : '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.requestedCheckOut ? formatDateTime(a.requestedCheckOut) : '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{a.reason}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge(a.status)}`}>{a.status}</span>
                                            {a.status === 'REJECTED' && a.rejectionReason && (
                                                <span className="ml-2 text-xs text-red-500">({a.rejectionReason})</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {a.status === 'TO_APPROVE' && (
                                                <button onClick={() => setCancelId(a.id)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">
                                                    <Trash2 className="w-3 h-3" /> Hủy
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>

            <AttendanceAdjustmentModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchData} />
            <ConfirmDialog open={!!cancelId} title="Hủy đơn bổ sung"
                message="Bạn chắc chắn muốn hủy đơn này?" danger
                onConfirm={doCancel} onCancel={() => setCancelId(null)} />
        </div>
    );
}
