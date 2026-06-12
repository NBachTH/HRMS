"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import {
    getAllAdjustments, approveAdjustment, rejectAdjustment,
} from '@/app/services/AttendanceAdjustmentService';
import { RejectReasonModal } from '@/app/components/common/RejectReasonModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { formatDateTime } from '@/app/commons/utils/formatters';
import type { AttendanceAdjustment } from '@/app/commons/types';

const STATUSES = ['TO_APPROVE', 'APPROVED', 'REJECTED'];

const badge = (s: string) => {
    const map: Record<string, string> = {
        TO_APPROVE: 'bg-amber-100 text-amber-700',
        APPROVED: 'bg-green-100 text-green-700',
        REJECTED: 'bg-red-100 text-red-700',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
};

export function AttendanceAdjustmentsContent() {
    const { showToast } = useToast();
    const [status, setStatus] = useState<string>('TO_APPROVE');
    const [rows, setRows] = useState<AttendanceAdjustment[]>([]);
    const [loading, setLoading] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllAdjustments(status);
            const data: any = res.data;
            setRows(Array.isArray(data) ? data : (data?.content ?? []));
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được danh sách', 'error');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [status, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const approve = async (id: string) => {
        setBusy(id);
        try {
            await approveAdjustment(id);
            showToast('Đã duyệt đơn bổ sung');
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Duyệt thất bại', 'error');
        } finally { setBusy(null); }
    };

    const doReject = async (reason: string) => {
        if (!rejectId) return;
        try {
            await rejectAdjustment(rejectId, reason);
            showToast('Đã từ chối đơn');
            setRejectId(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Từ chối thất bại', 'error');
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1">Đơn bổ sung chấm công</h1>
                    <p className="text-sm text-gray-500">Duyệt yêu cầu bổ sung/chỉnh giờ chấm công của nhân viên</p>
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Đang tải…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Nhân viên', 'Ngày', 'Giờ vào', 'Giờ ra', 'Lý do', 'Trạng thái', ''].map(h =>
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {rows.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Không có đơn</td></tr>
                                ) : rows.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.employeeName || a.employeeId}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.workDate}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.requestedCheckIn ? formatDateTime(a.requestedCheckIn) : '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.requestedCheckOut ? formatDateTime(a.requestedCheckOut) : '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{a.reason}</td>
                                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${badge(a.status)}`}>{a.status}</span></td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {a.status === 'TO_APPROVE' && (
                                                <>
                                                    <button disabled={busy === a.id} onClick={() => approve(a.id)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                                                        <Check className="w-3 h-3" /> Duyệt
                                                    </button>
                                                    <button onClick={() => setRejectId(a.id)}
                                                        className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                                                        <X className="w-3 h-3" /> Từ chối
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <RejectReasonModal isOpen={!!rejectId} onClose={() => setRejectId(null)} onConfirm={doReject} />
        </div>
    );
}
