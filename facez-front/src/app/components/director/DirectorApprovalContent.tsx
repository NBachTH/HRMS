"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircleIcon, XCircleIcon, BanknoteIcon } from 'lucide-react';
import {
    getPayrollsByPeriod,
    approvePayroll,
    rejectPayroll,
} from '@/app/services/PayrollService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Payroll } from '@/app/commons/types';
import { formatVnd } from '@/app/commons/utils/formatters';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_STYLES: Record<string, string> = {
    DRAFT:            'bg-yellow-100 text-yellow-800',
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
        <Modal isOpen={isOpen} onClose={onClose} title="Reject Payroll" width="max-w-sm">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                        placeholder="Explain why this payroll is rejected..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button disabled={!reason.trim()}
                        onClick={() => { if (reason.trim()) { onConfirm(reason); onClose(); } }}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                        Reject
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function DirectorApprovalContent() {
    const { showToast } = useToast();
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    const fetchPayrolls = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getPayrollsByPeriod(filterYear, filterMonth, page, 20);
            if (res.success && res.data) {
                setPayrolls(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load payroll data');
        } finally {
            setLoading(false);
        }
    }, [filterMonth, filterYear, page]);

    useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

    const handleApprove = async (id: string) => {
        try {
            await approvePayroll(id);
            showToast('Payroll approved');
            fetchPayrolls();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to approve', 'error');
        }
    };

    const handleReject = async (id: string, reason: string) => {
        try {
            await rejectPayroll(id, reason);
            showToast('Payroll rejected');
            fetchPayrolls();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to reject', 'error');
        }
    };

    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const pending = payrolls.filter(p => p.status === 'PENDING_APPROVAL');
    const totalNet = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const totalCost = payrolls.reduce((sum, p) => sum + (p.totalEmploymentCost || 0), 0);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2">Payroll Approvals</h1>
                <p className="text-sm text-gray-500">Director / Approvals</p>
            </div>

            {/* Period filter */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Month</label>
                    <select value={filterMonth} onChange={e => { setFilterMonth(Number(e.target.value)); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Year</label>
                    <select value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary */}
            {!loading && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
                        <p className="text-xs text-orange-600 font-medium mb-1">Awaiting Approval</p>
                        <p className="text-2xl font-bold text-orange-900">{pending.length}</p>
                        <p className="text-xs text-orange-500">payroll records</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                        <p className="text-xs text-blue-600 font-medium mb-1">Total Net Salary</p>
                        <p className="text-xl font-bold text-blue-900">{formatVnd(totalNet)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                        <p className="text-xs text-indigo-600 font-medium mb-1">Total Employment Cost</p>
                        <p className="text-xl font-bold text-indigo-900">{formatVnd(totalCost)}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                    <BanknoteIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">
                        {MONTHS[filterMonth - 1]} {filterYear} Payroll — {payrolls.length} records
                    </h2>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading…</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Employment Cost</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {payrolls.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                                            No payroll records for this period.
                                        </td>
                                    </tr>
                                ) : payrolls.map(p => (
                                    <tr key={p.payrollId} className={`hover:bg-gray-50 ${p.status === 'PENDING_APPROVAL' ? 'bg-orange-50/30' : ''}`}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {p.employeeName || p.employeeId}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatVnd(p.totalGross)}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatVnd(p.netSalary)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 text-right">
                                            {p.totalEmploymentCost ? formatVnd(p.totalEmploymentCost) : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.status === 'PENDING_APPROVAL' ? (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleApprove(p.payrollId)}
                                                        className="p-1 text-gray-500 hover:text-green-600" title="Approve">
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => setRejectTarget(p.payrollId)}
                                                        className="p-1 text-gray-500 hover:text-red-600" title="Reject">
                                                        <XCircleIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600">
                        <span>Page {page + 1} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Previous</button>
                            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
                        </div>
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
