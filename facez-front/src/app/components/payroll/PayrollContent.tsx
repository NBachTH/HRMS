"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Trash2Icon, CalculatorIcon, CheckCircleIcon, PlayIcon, XCircleIcon } from 'lucide-react';
import {
    getPayrollsByPeriod,
    calculatePayroll,
    batchCalculatePayroll,
    pollPayrollJob,
    approvePayroll,
    markPaidPayroll,
    deletePayroll,
} from '@/app/services/PayrollService';
import { getEmployees } from '@/app/services/EmployeeService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Payroll, PayrollJobResponse, Employee } from '@/app/commons/types';

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

function fmt(value: number | null | undefined) {
    if (value == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

// ─── Single-employee Calculate Modal ──────────────────────────────────────────

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
        kpi1Rating: 'B' as 'A' | 'B' | 'C',
        standardWorkingDays: 26,
        bonus: 0,
        japaneseLevel: '' as 'N1' | 'N2' | '',
        odcAllowance: 0,
        notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setForm(f => ({ ...f, payrollYear: defaultYear, payrollMonth: defaultMonth, employeeId: '' }));
            setErrors({});
        }
    }, [isOpen, defaultYear, defaultMonth]);

    const set = (field: string, value: string | number) =>
        setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.employeeId) { setErrors({ employeeId: 'Employee is required' }); return; }
        setSaving(true);
        try {
            await calculatePayroll({
                employeeId: form.employeeId,
                payrollYear: form.payrollYear,
                payrollMonth: form.payrollMonth,
                kpi1Rating: form.kpi1Rating,
                standardWorkingDays: form.standardWorkingDays,
                bonus: form.bonus,
                japaneseLevel: (form.japaneseLevel as 'N1' | 'N2') || null,
                odcAllowance: form.odcAllowance,
                notes: form.notes || undefined,
            });
            showToast('Payroll calculated and saved as DRAFT');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Calculation failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Calculate — Single Employee" width="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={form.employeeId}
                        onChange={e => set('employeeId', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                            ${errors.employeeId ? 'border-red-400' : 'border-gray-300'}`}
                    >
                        <option value="">— Select employee —</option>
                        {employees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                                {emp.name} ({emp.employeeId})
                            </option>
                        ))}
                    </select>
                    {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId}</p>}
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
                        <select value={form.payrollYear} onChange={e => set('payrollYear', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">KPI1 Rating</label>
                        <select value={form.kpi1Rating} onChange={e => set('kpi1Rating', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="A">A (×1.04)</option>
                            <option value="B">B (×1.00)</option>
                            <option value="C">C (×0.98)</option>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">ODC Allowance (VND)</label>
                        <input type="number" min={0} value={form.odcAllowance}
                            onChange={e => set('odcAllowance', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Japanese Level</label>
                        <select value={form.japaneseLevel} onChange={e => set('japaneseLevel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">None</option>
                            <option value="N1">N1</option>
                            <option value="N2">N2</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
                        placeholder="Optional note"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        <CalculatorIcon className="w-4 h-4" />
                        {saving ? 'Calculating…' : 'Calculate'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Batch Calculate Modal with polling ───────────────────────────────────────

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
    const [form, setForm] = useState({ payrollYear: defaultYear, payrollMonth: defaultMonth, standardWorkingDays: 26, kpi1Rating: 'B' as 'A' | 'B' | 'C' });
    const [job, setJob] = useState<PayrollJobResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPhase('form');
            setJob(null);
            setForm(f => ({ ...f, payrollYear: defaultYear, payrollMonth: defaultMonth }));
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [isOpen, defaultYear, defaultMonth]);

    const startPolling = (jobId: string) => {
        pollRef.current = setInterval(async () => {
            try {
                const res = await pollPayrollJob(jobId);
                if (res.success && res.data) {
                    setJob(res.data);
                    if (res.data.state === 'COMPLETED' || res.data.state === 'FAILED') {
                        clearInterval(pollRef.current!);
                        if (res.data.state === 'COMPLETED') onSuccess();
                    }
                }
            } catch { clearInterval(pollRef.current!); }
        }, 1500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await batchCalculatePayroll(form);
            if (res.success && res.data) {
                setJob(res.data);
                setPhase('polling');
                startPolling(res.data.jobId);
            }
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to start batch job', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const set = (field: string, value: string | number) => setForm(f => ({ ...f, [field]: value }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Batch Calculate — All Employees" width="max-w-lg">
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
                            <select value={form.payrollYear} onChange={e => set('payrollYear', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">KPI1 Default</label>
                            <select value={form.kpi1Rating} onChange={e => set('kpi1Rating', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="A">A (×1.04)</option>
                                <option value="B">B (×1.00)</option>
                                <option value="C">C (×0.98)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Standard Working Days</label>
                            <input type="number" min={1} max={31} value={form.standardWorkingDays}
                                onChange={e => set('standardWorkingDays', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-3">
                        Calculates payroll for <strong>all active employees</strong>. Employees who already have a record for this period are skipped.
                        Runs asynchronously — you can monitor progress on screen.
                    </p>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                            <PlayIcon className="w-4 h-4" />
                            {submitting ? 'Starting…' : 'Run Batch'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    {job && (
                        <>
                            <div className="flex items-center gap-3">
                                {job.state === 'PENDING' || job.state === 'RUNNING' ? (
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                ) : job.state === 'COMPLETED' ? (
                                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 text-red-600" />
                                )}
                                <span className="text-sm font-medium text-gray-800">
                                    {job.state === 'PENDING' ? 'Queued…' :
                                        job.state === 'RUNNING' ? 'Processing…' :
                                            job.state === 'COMPLETED' ? 'Completed' : 'Failed'}
                                </span>
                            </div>

                            <div className="grid grid-cols-4 gap-3 text-center">
                                {[
                                    { label: 'Total', value: job.total, color: 'text-gray-800' },
                                    { label: 'Done', value: job.succeeded, color: 'text-green-700' },
                                    { label: 'Skipped', value: job.skipped, color: 'text-yellow-700' },
                                    { label: 'Failed', value: job.failed, color: 'text-red-700' },
                                ].map(s => (
                                    <div key={s.label} className="bg-gray-50 rounded-md p-3">
                                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                                        <div className="text-xs text-gray-500">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {job.errors.length > 0 && (
                                <div className="bg-red-50 rounded-md p-3">
                                    <p className="text-xs font-semibold text-red-700 mb-1">Errors ({job.errors.length})</p>
                                    <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                                        {job.errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </div>
                            )}

                            {job.failureReason && (
                                <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{job.failureReason}</p>
                            )}
                        </>
                    )}

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            {job?.state === 'COMPLETED' || job?.state === 'FAILED' ? 'Close' : 'Close (job continues)'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ─── Main HR Payroll Content ───────────────────────────────────────────────────

export function PayrollContent() {
    const { showToast } = useToast();
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSingle, setShowSingle] = useState(false);
    const [showBatch, setShowBatch] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);

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

    useEffect(() => {
        getEmployees(0, 200).then(r => {
            if (r.success && r.data) setEmployees(r.data.content);
        });
    }, []);

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

    const handleMarkPaid = async (id: string) => {
        try {
            await markPaidPayroll(id);
            showToast('Marked as paid');
            fetchPayrolls();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to mark paid', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deletePayroll(id);
            showToast('Payroll record deleted');
            setDeleteConfirm(null);
            fetchPayrolls();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">Payroll</h1>
                    <p className="text-sm text-gray-500">HR / Payroll</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowSingle(true)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2 text-sm">
                        <CalculatorIcon className="w-4 h-4" />
                        Single Employee
                    </button>
                    <button onClick={() => setShowBatch(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm">
                        <PlayIcon className="w-4 h-4" />
                        Batch Calculate
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

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {MONTHS[filterMonth - 1]} {filterYear}
                    </h2>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual Days</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">KPI avg</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {payrolls.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                                            No payroll records for this period.
                                            Use &quot;Batch Calculate&quot; to generate them.
                                        </td>
                                    </tr>
                                ) : payrolls.map(p => (
                                    <tr key={p.payrollId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {p.employeeName || p.employeeId}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {p.actualWorkingDays ?? '—'}/{p.standardWorkingDays ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {p.kpiAverage?.toFixed(2) ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {fmt(p.totalGross)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-red-600 text-right">
                                            {fmt((p.bhxhEmployee ?? 0) + (p.bhytEmployee ?? 0) + (p.bhtnEmployee ?? 0) + (p.pit ?? 0))}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                            {fmt(p.netSalary)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-1">
                                                {p.status === 'DRAFT' && (
                                                    <>
                                                        <button onClick={() => handleApprove(p.payrollId)}
                                                            className="p-1 text-gray-500 hover:text-blue-600"
                                                            title="Approve">
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm(p.payrollId)}
                                                            className="p-1 text-gray-500 hover:text-red-600"
                                                            title="Delete">
                                                            <Trash2Icon className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {p.status === 'APPROVED' && (
                                                    <button onClick={() => handleMarkPaid(p.payrollId)}
                                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                        title="Mark as Paid">
                                                        Mark Paid
                                                    </button>
                                                )}
                                                {p.status === 'PAID' && (
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

            <SingleCalcModal
                isOpen={showSingle}
                onClose={() => setShowSingle(false)}
                onSuccess={fetchPayrolls}
                employees={employees}
                defaultYear={filterYear}
                defaultMonth={filterMonth}
            />
            <BatchCalcModal
                isOpen={showBatch}
                onClose={() => setShowBatch(false)}
                onSuccess={fetchPayrolls}
                defaultYear={filterYear}
                defaultMonth={filterMonth}
            />

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Payroll Record</h3>
                        <p className="text-sm text-gray-600 mb-4">Only DRAFT records can be deleted. Continue?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
