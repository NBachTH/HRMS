"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Paperclip } from 'lucide-react';
import { Modal } from '@/app/components/common/Modal';
import { ApprovalStepper } from '@/app/components/common/ApprovalStepper';
import { createLeave, getMyBalances } from '@/app/services/LeaveService';
import { getMyProjects } from '@/app/services/ProjectService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { LeaveType, LeaveBalance, Project } from '@/app/commons/types';

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
    { value: 'ANNUAL', label: 'Annual Leave' },
    { value: 'COMPENSATORY', label: 'Compensatory Leave' },
    { value: 'SICK', label: 'Sick Leave (social insurance)' },
    { value: 'MATERNITY', label: 'Maternity Leave' },
    { value: 'PATERNITY', label: 'Paternity Leave' },
    { value: 'BEREAVEMENT', label: 'Bereavement Leave' },
    { value: 'MARRIAGE', label: 'Marriage Leave' },
    { value: 'UNPAID', label: 'Unpaid Leave' },
];

// Leave types whose balance is tracked (others have no remaining quota).
const BALANCE_TRACKED: LeaveType[] = ['ANNUAL', 'COMPENSATORY'];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface DetailRow { date: string; days: number; hours: number; }

function inclusiveDays(from: string, to: string): number {
    if (!from || !to) return 0;
    const a = new Date(from + 'T00:00:00').getTime();
    const b = new Date(to + 'T00:00:00').getTime();
    if (b < a) return 0;
    return Math.round((b - a) / 86_400_000) + 1;
}

export function LeaveFormModal({ isOpen, onClose, onSuccess }: Props) {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [projects, setProjects] = useState<Project[]>([]);
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [form, setForm] = useState({
        projectId: '',
        leaveType: 'ANNUAL' as LeaveType,
        from: '',
        to: '',
        halfDay: false,
        reason: '',
        attachmentName: '' as string | undefined,
    });

    useEffect(() => {
        if (!isOpen) return;
        const today = new Date().toISOString().slice(0, 10);
        setForm({ projectId: '', leaveType: 'ANNUAL', from: today, to: today, halfDay: false, reason: '', attachmentName: '' });
        setErrors({});
        getMyBalances()
            .then(res => setBalances(Array.isArray(res.data) ? res.data : []))
            .catch(() => setBalances([]));
        getMyProjects()
            .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
            .catch(() => setProjects([]));
    }, [isOpen]);

    const set = (field: string, value: any) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    };

    // ── Remaining balance for the selected type (current year) ──
    const currentYear = new Date().getFullYear();
    const balanceFor = (t: LeaveType) =>
        balances.find(b => b.leaveType === t && b.leaveYear === currentYear);
    const selectedBalance = balanceFor(form.leaveType);
    const isTracked = BALANCE_TRACKED.includes(form.leaveType);

    // ── Computed duration + per-day breakdown (VMS "Leave Details") ──
    const { totalDays, totalHours, details } = useMemo(() => {
        if (form.halfDay) {
            return { totalDays: 0.5, totalHours: 4, details: [{ date: form.from, days: 0.5, hours: 4 }] as DetailRow[] };
        }
        const n = inclusiveDays(form.from, form.to);
        const rows: DetailRow[] = [];
        for (let i = 0; i < n; i++) {
            const d = new Date(form.from + 'T00:00:00');
            d.setDate(d.getDate() + i);
            rows.push({ date: d.toISOString().slice(0, 10), days: 1, hours: 8 });
        }
        return { totalDays: n, totalHours: n * 8, details: rows };
    }, [form.from, form.to, form.halfDay]);

    const exceedBalance = isTracked && selectedBalance != null && totalDays > selectedBalance.remainingDays;

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.reason.trim()) errs.reason = 'Reason is required';
        if (!form.from) errs.from = 'From date is required';
        if (!form.to) errs.to = 'To date is required';
        else if (form.from && form.to && form.to < form.from) errs.to = 'To date must be after from date';
        if (totalDays <= 0) errs.to = 'Invalid leave duration';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!user?.employeeId) { showToast('Cannot identify current employee', 'error'); return; }
        setSaving(true);
        try {
            const endDate = form.halfDay ? form.from : form.to;
            await createLeave({
                employeeId: user.employeeId,
                projectId: form.projectId || undefined,
                leaveType: form.leaveType,
                reason: form.reason,
                startTime: `${form.from}T08:00:00`,
                endTime: form.halfDay ? `${form.from}T12:00:00` : `${endDate}T17:00:00`,
                halfDay: form.halfDay,
                attachmentName: form.attachmentName || undefined,
            });
            showToast('Leave request submitted');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to submit leave request', 'error');
        } finally {
            setSaving(false);
        }
    };

    const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
    const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Leave Request / New" width="max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-5">
                <ApprovalStepper status="DRAFT" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left column */}
                    <div className="space-y-3">
                        <div>
                            <label className={labelCls}>Project</label>
                            <select className={inputCls} value={form.projectId}
                                onChange={e => set('projectId', e.target.value)}>
                                <option value="">— No project —</option>
                                {projects.map(p => (
                                    <option key={p.projectId} value={p.projectId}>
                                        {p.code ? `${p.code} · ` : ''}{p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Leave Type <span className="text-red-500">*</span></label>
                            <select className={inputCls} value={form.leaveType}
                                onChange={e => set('leaveType', e.target.value as LeaveType)}>
                                {LEAVE_TYPES.map(t => {
                                    const bal = balanceFor(t.value);
                                    const suffix = BALANCE_TRACKED.includes(t.value) && bal
                                        ? ` (${bal.remainingDays} remaining out of ${bal.entitlementDays + bal.carriedOverDays} days)`
                                        : '';
                                    return <option key={t.value} value={t.value}>{t.label}{suffix}</option>;
                                })}
                            </select>
                            {isTracked && (
                                <p className="mt-1 text-xs text-gray-500">
                                    {selectedBalance
                                        ? <>Remaining: <span className="font-semibold text-blue-600">{selectedBalance.remainingDays}</span> days</>
                                        : <span className="text-amber-600">No balance record for {currentYear} — contact HR.</span>}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>From <span className="text-red-500">*</span></label>
                                <input type="date" className={inputCls} value={form.from}
                                    onChange={e => set('from', e.target.value)} />
                                {errors.from && <p className="text-xs text-red-500 mt-1">{errors.from}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>To <span className="text-red-500">*</span></label>
                                <input type="date" className={inputCls} value={form.to} disabled={form.halfDay}
                                    onChange={e => set('to', e.target.value)} />
                                {errors.to && <p className="text-xs text-red-500 mt-1">{errors.to}</p>}
                            </div>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={form.halfDay}
                                onChange={e => set('halfDay', e.target.checked)} />
                            Half Day
                        </label>
                        <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                            <span className="text-xs text-gray-500">Leave duration</span>
                            <div className="text-sm font-semibold text-gray-800">
                                {totalDays} Days · {totalHours} Hours
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-3">
                        <div>
                            <label className={labelCls}>Manager</label>
                            <input className={`${inputCls} bg-gray-50`} readOnly value="(auto by department)" />
                        </div>
                        <div>
                            <label className={labelCls}>Employee</label>
                            <input className={`${inputCls} bg-gray-50`} readOnly
                                value={user?.username ?? user?.employeeId ?? '—'} />
                        </div>
                        <div>
                            <label className={labelCls}>Reason Detail <span className="text-red-500">*</span></label>
                            <textarea rows={4} className={`${inputCls} resize-none ${errors.reason ? 'border-red-400' : ''}`}
                                placeholder="Describe the reason for your leave…"
                                value={form.reason} onChange={e => set('reason', e.target.value)} />
                            {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
                        </div>
                    </div>
                </div>

                {exceedBalance && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        Requested {totalDays} days exceeds your remaining balance ({selectedBalance?.remainingDays} days).
                    </div>
                )}

                {/* File upload */}
                <div>
                    <h3 className="text-sm font-semibold text-blue-600 mb-2">File upload</h3>
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md cursor-pointer hover:bg-blue-700">
                        <Paperclip className="w-4 h-4" />
                        Upload your file
                        <input type="file" className="hidden"
                            onChange={e => set('attachmentName', e.target.files?.[0]?.name)} />
                    </label>
                    {form.attachmentName && <span className="ml-3 text-sm text-gray-600">{form.attachmentName}</span>}
                </div>

                {/* Leave Details */}
                <div>
                    <h3 className="text-sm font-semibold text-blue-600 mb-2">Leave Details</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-2 text-left">Date</th>
                                    <th className="px-4 py-2 text-right">Leave duration (Days)</th>
                                    <th className="px-4 py-2 text-right">Leave duration (Hours)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {details.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Select a date range</td></tr>
                                ) : details.map((d, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2 text-gray-700">{d.date}</td>
                                        <td className="px-4 py-2 text-right">{d.days}</td>
                                        <td className="px-4 py-2 text-right">{d.hours}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Discard
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Submitting…' : 'Submit Request'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
