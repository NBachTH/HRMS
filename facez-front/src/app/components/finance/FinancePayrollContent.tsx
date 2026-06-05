"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { XCircleIcon, BanknoteIcon, ClipboardListIcon, CalculatorIcon, LayersIcon, RefreshCwIcon } from 'lucide-react';
import {
    getPayrollsByPeriod,
    rejectPayroll,
    submitPayroll,
    markPaidPayroll,
    calculatePayroll,
    batchCalculatePayroll,
    pollPayrollJob,
} from '@/app/services/PayrollService';
import { getEmployees } from '@/app/services/EmployeeService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Payroll, Employee, PayrollJobResponse } from '@/app/commons/types';
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

const KPI_OPTIONS = ['A', 'B', 'C'] as const;
const JP_OPTIONS = ['N1', 'N2'] as const;

// ── Reject Modal ──────────────────────────────────────────────────────────────

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
                    <textarea
                        rows={3} value={reason} onChange={e => setReason(e.target.value)}
                        placeholder="Explain why this payroll is rejected..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button
                        disabled={!reason.trim()}
                        onClick={() => { if (reason.trim()) { onConfirm(reason); onClose(); } }}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                        Reject
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ── Single Calculate Modal ────────────────────────────────────────────────────

interface SingleCalcModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employees: Employee[];
    defaultYear: number;
    defaultMonth: number;
}

function SingleCalcModal({ isOpen, onClose, onSuccess, employees, defaultYear, defaultMonth }: SingleCalcModalProps) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        employeeId: '',
        payrollYear: defaultYear,
        payrollMonth: defaultMonth,
        kpi1Rating: 'A' as 'A' | 'B' | 'C',
        kpi2Rating: '' as '' | 'A' | 'B' | 'C',
        standardWorkingDays: 22,
        bonus: 0,
        japaneseLevel: '' as '' | 'N1' | 'N2',
        notes: '',
    });

    useEffect(() => {
        if (isOpen) setForm(f => ({ ...f, payrollYear: defaultYear, payrollMonth: defaultMonth, employeeId: '' }));
    }, [isOpen, defaultYear, defaultMonth]);

    const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.employeeId) { showToast('Select an employee', 'error'); return; }
        setSaving(true);
        try {
            await calculatePayroll({
                employeeId: form.employeeId,
                payrollYear: form.payrollYear,
                payrollMonth: form.payrollMonth,
                kpi1Rating: form.kpi1Rating || undefined,
                kpi2Rating: form.kpi2Rating || null,
                standardWorkingDays: form.standardWorkingDays || undefined,
                bonus: form.bonus || undefined,
                japaneseLevel: form.japaneseLevel || null,
                notes: form.notes || undefined,
            });
            showToast('Payroll calculated');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Calculation failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Calculate Single Payroll" width="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee <span className="text-red-500">*</span></label>
                    <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">— Select employee —</option>
                        {employees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>{emp.name} ({emp.employeeId})</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select value={form.payrollMonth} onChange={e => set('payrollMonth', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <input type="number" value={form.payrollYear} onChange={e => set('payrollYear', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">KPI Rating 1</label>
                        <select value={form.kpi1Rating} onChange={e => set('kpi1Rating', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            {KPI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">KPI Rating 2</label>
                        <select value={form.kpi2Rating} onChange={e => set('kpi2Rating', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">— None —</option>
                            {KPI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Standard Working Days</label>
                        <input type="number" min={1} max={31} value={form.standardWorkingDays}
                            onChange={e => set('standardWorkingDays', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bonus (VND)</label>
                        <input type="number" min={0} value={form.bonus}
                            onChange={e => set('bonus', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Japanese Level</label>
                        <select value={form.japaneseLevel} onChange={e => set('japaneseLevel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">— None —</option>
                            {JP_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Calculating…' : 'Calculate'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Batch Calculate Modal ─────────────────────────────────────────────────────

interface BatchCalcModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultYear: number;
    defaultMonth: number;
}

function BatchCalcModal({ isOpen, onClose, onSuccess, defaultYear, defaultMonth }: BatchCalcModalProps) {
    const { showToast } = useToast();
    const [phase, setPhase] = useState<'form' | 'polling'>('form');
    const [saving, setSaving] = useState(false);
    const [job, setJob] = useState<PayrollJobResponse | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [form, setForm] = useState({
        payrollYear: defaultYear,
        payrollMonth: defaultMonth,
        standardWorkingDays: 22,
        kpi1Rating: 'A' as 'A' | 'B' | 'C',
    });

    useEffect(() => {
        if (isOpen) {
            setPhase('form');
            setJob(null);
            setForm(f => ({ ...f, payrollYear: defaultYear, payrollMonth: defaultMonth }));
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [isOpen, defaultYear, defaultMonth]);

    const startPolling = useCallback((jobId: string) => {
        pollRef.current = setInterval(async () => {
            try {
                const res = await pollPayrollJob(jobId);
                if (res.success && res.data) {
                    setJob(res.data);
                    if (res.data.state === 'COMPLETED' || res.data.state === 'FAILED') {
                        clearInterval(pollRef.current!);
                        if (res.data.state === 'COMPLETED') {
                            showToast(`Batch done: ${res.data.succeeded} calculated, ${res.data.failed} failed`);
                            onSuccess();
                        } else {
                            showToast('Batch job failed', 'error');
                        }
                    }
                }
            } catch { /* ignore poll errors */ }
        }, 3000);
    }, [showToast, onSuccess]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await batchCalculatePayroll({
                payrollYear: form.payrollYear,
                payrollMonth: form.payrollMonth,
                standardWorkingDays: form.standardWorkingDays,
                kpi1Rating: form.kpi1Rating,
            });
            if (res.success && res.data) {
                setJob(res.data);
                setPhase('polling');
                if (res.data.state !== 'COMPLETED' && res.data.state !== 'FAILED') {
                    startPolling(res.data.jobId);
                }
            }
        } catch (err: any) {
            showToast(err?.body?.message || 'Batch calculation failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Batch Calculate Payroll" width="max-w-md">
            {phase === 'form' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <select value={form.payrollMonth} onChange={e => set('payrollMonth', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <input type="number" value={form.payrollYear} onChange={e => set('payrollYear', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Standard Working Days</label>
                            <input type="number" min={1} max={31} value={form.standardWorkingDays}
                                onChange={e => set('standardWorkingDays', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default KPI 1</label>
                            <select value={form.kpi1Rating} onChange={e => set('kpi1Rating', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {KPI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">This will calculate payroll for all active employees in the period.</p>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Starting…' : 'Start Batch'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Job: <span className="font-mono text-xs text-gray-500">{job?.jobId}</span></p>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium
                            ${job?.state === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              job?.state === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'}`}>
                            {job?.state}
                        </span>
                    </div>

                    {job && (
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-lg font-bold text-gray-800">{job.total}</p>
                                <p className="text-xs text-gray-500">Total</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-lg font-bold text-green-700">{job.succeeded}</p>
                                <p className="text-xs text-green-600">Succeeded</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <p className="text-lg font-bold text-red-700">{job.failed}</p>
                                <p className="text-xs text-red-600">Failed</p>
                            </div>
                        </div>
                    )}

                    {(job?.state === 'PENDING' || job?.state === 'RUNNING') && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                            <RefreshCwIcon className="w-4 h-4 animate-spin" />
                            Processing… (auto-refreshing every 3s)
                        </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FinancePayrollContent() {
    const { showToast } = useToast();
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [showSingleCalc, setShowSingleCalc] = useState(false);
    const [showBatchCalc, setShowBatchCalc] = useState(false);

    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    const fetchPayrolls = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [payrollRes, empRes] = await Promise.all([
                getPayrollsByPeriod(filterYear, filterMonth, page, 20),
                getEmployees(0, 200),
            ]);
            if (payrollRes.success && payrollRes.data) {
                setPayrolls(payrollRes.data.content);
                setTotalPages(payrollRes.data.totalPages);
            }
            if (empRes.success && empRes.data) setEmployees(empRes.data.content);
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load payroll data');
        } finally {
            setLoading(false);
        }
    }, [filterMonth, filterYear, page]);

    useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

    const handleSubmit = async (id: string) => {
        try {
            await submitPayroll(id);
            showToast('Payroll submitted for approval');
            fetchPayrolls();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to submit', 'error');
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

    const handleMarkPaid = async (id: string) => {
        try {
            await markPaidPayroll(id);
            showToast('Marked as paid');
            fetchPayrolls();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to mark paid', 'error');
        }
    };

    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const byStatus = payrolls.reduce<Record<string, number>>((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">Payroll</h1>
                    <p className="text-sm text-gray-500">Finance / Payroll</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSingleCalc(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-blue-300 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100">
                        <CalculatorIcon className="w-4 h-4" /> Calculate Single
                    </button>
                    <button onClick={() => setShowBatchCalc(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-violet-300 text-violet-700 bg-violet-50 rounded-md hover:bg-violet-100">
                        <LayersIcon className="w-4 h-4" /> Batch Calculate
                    </button>
                </div>
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

            {/* Status summary */}
            {!loading && payrolls.length > 0 && (
                <div className="grid grid-cols-5 gap-3 mb-4">
                    {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID'].map(s => (
                        <div key={s} className={`rounded-lg p-3 border ${STATUS_STYLES[s]} border-opacity-30 text-center`}>
                            <div className="text-xl font-bold">{byStatus[s] || 0}</div>
                            <div className="text-xs opacity-80">{s.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <ClipboardListIcon className="w-5 h-5 text-blue-600" />
                        {MONTHS[filterMonth - 1]} {filterYear} — {payrolls.length} records
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
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Employer Cost</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                                    <tr key={p.payrollId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            <Link href={`/finance/payroll/${p.payrollId}`}
                                                className="hover:text-blue-600 hover:underline">
                                                {p.employeeName || p.employeeId}
                                            </Link>
                                            {p.rejectionReason && (
                                                <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs" title={p.rejectionReason}>
                                                    ✗ {p.rejectionReason}
                                                </p>
                                            )}
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
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {p.status === 'DRAFT' && (
                                                    <button onClick={() => handleSubmit(p.payrollId)}
                                                        className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
                                                        Submit
                                                    </button>
                                                )}
                                                {p.status === 'PENDING_APPROVAL' && (
                                                    <button onClick={() => setRejectTarget(p.payrollId)}
                                                        className="p-1 text-gray-500 hover:text-red-600" title="Reject">
                                                        <XCircleIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {p.status === 'APPROVED' && (
                                                    <button onClick={() => handleMarkPaid(p.payrollId)}
                                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1">
                                                        <BanknoteIcon className="w-3 h-3" /> Mark Paid
                                                    </button>
                                                )}
                                                {(p.status === 'PAID' || p.status === 'REJECTED') && (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </div>
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

            <SingleCalcModal
                isOpen={showSingleCalc}
                onClose={() => setShowSingleCalc(false)}
                onSuccess={fetchPayrolls}
                employees={employees}
                defaultYear={filterYear}
                defaultMonth={filterMonth}
            />

            <BatchCalcModal
                isOpen={showBatchCalc}
                onClose={() => setShowBatchCalc(false)}
                onSuccess={fetchPayrolls}
                defaultYear={filterYear}
                defaultMonth={filterMonth}
            />
        </div>
    );
}
