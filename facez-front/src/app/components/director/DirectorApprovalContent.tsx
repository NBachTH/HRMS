"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircleIcon, XCircleIcon, BanknoteIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getRuns, approveRun, rejectRun, type PayrollRun } from '@/app/services/PayrollRunService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { formatVnd } from '@/app/commons/utils/formatters';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_STYLES: Record<string, string> = {
    DRAFT:            'bg-gray-100 text-gray-600',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
    APPROVED:         'bg-blue-100 text-blue-800',
    REJECTED:         'bg-red-100 text-red-800',
    PAID:             'bg-green-100 text-green-800',
};

function RejectModal({ isOpen, onClose, onConfirm }: {
    isOpen: boolean; onClose: () => void; onConfirm: (reason: string) => void;
}) {
    const [reason, setReason] = useState('');
    useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Trả lại kỳ lương" width="max-w-sm">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lý do trả lại <span className="text-red-500">*</span>
                    </label>
                    <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                        placeholder="Giải thích vì sao trả lại kỳ lương này…"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
                    <button disabled={!reason.trim()}
                        onClick={() => { if (reason.trim()) { onConfirm(reason); onClose(); } }}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                        Trả lại
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function DirectorApprovalContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const fetchRuns = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getRuns();
            setRuns(res.data ?? []);
        } catch (err: any) {
            setError(err?.body?.message || 'Không tải được danh sách kỳ lương');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRuns(); }, [fetchRuns]);

    const handleApprove = async (id: string) => {
        setBusy(id);
        try {
            await approveRun(id);
            showToast('Đã duyệt kỳ lương');
            fetchRuns();
        } catch (err: any) {
            showToast(err?.body?.message || 'Duyệt thất bại', 'error');
        } finally { setBusy(null); }
    };

    const handleReject = async (id: string, reason: string) => {
        setBusy(id);
        try {
            await rejectRun(id, reason);
            showToast('Đã trả lại kỳ lương');
            fetchRuns();
        } catch (err: any) {
            showToast(err?.body?.message || 'Trả lại thất bại', 'error');
        } finally { setBusy(null); }
    };

    const pending = runs.filter(r => r.status === 'PENDING_APPROVAL');
    const totalNet = pending.reduce((s, r) => s + (r.totalNet || 0), 0);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2">Duyệt bảng lương</h1>
                <p className="text-sm text-gray-500">Director / Duyệt cả kỳ lương (PayrollRun)</p>
            </div>

            {!loading && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
                        <p className="text-xs text-orange-600 font-medium mb-1">Kỳ chờ duyệt</p>
                        <p className="text-2xl font-bold text-orange-900">{pending.length}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                        <p className="text-xs text-blue-600 font-medium mb-1">Tổng lương net (chờ duyệt)</p>
                        <p className="text-xl font-bold text-blue-900">{formatVnd(totalNet)}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                    <BanknoteIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Kỳ lương — {runs.length}</h2>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Đang tải…</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kỳ</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số NV</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng Gross</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng Net</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {runs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                                            Chưa có kỳ lương nào. Finance tạo kỳ ở màn &quot;Payroll Runs&quot;.
                                        </td>
                                    </tr>
                                ) : runs.map(r => (
                                    <tr key={r.id} className={`hover:bg-gray-50 ${r.status === 'PENDING_APPROVAL' ? 'bg-orange-50/30' : ''}`}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {MONTHS[r.month - 1]} {r.year}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.employeeCount}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatVnd(r.totalGross)}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatVnd(r.totalNet)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => router.push('/finance/payroll-runs')}
                                                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
                                                    Xem dòng
                                                </button>
                                                {r.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button disabled={busy === r.id} onClick={() => handleApprove(r.id)}
                                                            className="p-1 text-gray-500 hover:text-green-600 disabled:opacity-50" title="Duyệt cả kỳ">
                                                            <CheckCircleIcon className="w-5 h-5" />
                                                        </button>
                                                        <button disabled={busy === r.id} onClick={() => setRejectTarget(r.id)}
                                                            className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50" title="Trả lại cả kỳ">
                                                            <XCircleIcon className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <RejectModal
                isOpen={!!rejectTarget}
                onClose={() => setRejectTarget(null)}
                onConfirm={(reason) => { if (rejectTarget) handleReject(rejectTarget, reason); setRejectTarget(null); }}
            />
        </div>
    );
}
