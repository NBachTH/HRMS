"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, AlertTriangle, Paperclip } from 'lucide-react';
import { Modal } from '@/app/components/common/Modal';
import { ApprovalStepper } from '@/app/components/common/ApprovalStepper';
import { createOTRequest } from '@/app/services/OTRequestService';
import { getMyProjects } from '@/app/services/ProjectService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { OTRequestLine, OTCategory, Project } from '@/app/commons/types';
import { OT_RATE_BY_CATEGORY } from '@/app/commons/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const MAX_MONTHLY_OT_HOURS = 40; // Bộ Luật Lao Động 2019, Điều 107

// ── Helpers ──────────────────────────────────────────────────────────────
function hoursBetween(from: string, to: string): number {
    if (!from || !to) return 0;
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const mins = (th * 60 + tm) - (fh * 60 + fm);
    return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
}

function deriveCategory(workDate: string): OTCategory {
    if (!workDate) return 'WEEKDAY';
    const day = new Date(workDate + 'T00:00:00').getDay(); // 0 Sun … 6 Sat
    return day === 0 || day === 6 ? 'WEEKEND' : 'WEEKDAY';
}

function emptyLine(): OTRequestLine {
    const today = new Date().toISOString().slice(0, 10);
    return {
        workDate: today,
        fromTime: '18:00',
        toTime: '20:00',
        otCategory: deriveCategory(today),
        wfh: false,
        reason: '',
    };
}

export function OTFormModal({ isOpen, onClose, onSuccess }: Props) {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectId, setProjectId] = useState('');
    const [lines, setLines] = useState<OTRequestLine[]>([emptyLine()]);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setLines([emptyLine()]);
        setProjectId('');
        setFormError('');
        // Projects are optional context; degrade gracefully if endpoint missing.
        getMyProjects()
            .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
            .catch(() => setProjects([]));
    }, [isOpen]);

    const selectedProject = projects.find(p => p.projectId === projectId);

    // OT month derived from the earliest line date
    const otMonth = useMemo(() => {
        const dates = lines.map(l => l.workDate).filter(Boolean).sort();
        return dates[0]?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
    }, [lines]);

    const totalHours = useMemo(
        () => lines.reduce((sum, l) => sum + hoursBetween(l.fromTime, l.toTime), 0),
        [lines],
    );

    // ── Per-line warnings (overlap + reason) and monthly cap ──
    const lineWarnings = useMemo(() => lines.map((l, i) => {
        if (hoursBetween(l.fromTime, l.toTime) <= 0) return 'End must be after start';
        const overlap = lines.some((o, j) =>
            j !== i && o.workDate === l.workDate &&
            l.fromTime < o.toTime && o.fromTime < l.toTime);
        if (overlap) return 'Overlaps another line on the same day';
        return '';
    }), [lines]);

    const exceedMonthly = totalHours > MAX_MONTHLY_OT_HOURS;

    const updateLine = (idx: number, patch: Partial<OTRequestLine>) => {
        setLines(ls => ls.map((l, i) => {
            if (i !== idx) return l;
            const next = { ...l, ...patch };
            // Re-derive category when the date changes (user can still override)
            if (patch.workDate) next.otCategory = deriveCategory(patch.workDate);
            return next;
        }));
        setFormError('');
    };

    const addLine = () => setLines(ls => [...ls, emptyLine()]);
    const removeLine = (idx: number) =>
        setLines(ls => ls.length === 1 ? ls : ls.filter((_, i) => i !== idx));

    const validate = (): boolean => {
        if (lines.length === 0) { setFormError('Add at least one OT line'); return false; }
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (!l.workDate || !l.fromTime || !l.toTime) {
                setFormError(`Line ${i + 1}: date, from and to are required`); return false;
            }
            if (hoursBetween(l.fromTime, l.toTime) <= 0) {
                setFormError(`Line ${i + 1}: end time must be after start time`); return false;
            }
            if (!l.reason.trim()) {
                setFormError(`Line ${i + 1}: reason is required`); return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!user?.employeeId) { showToast('Cannot identify current employee', 'error'); return; }
        setSaving(true);
        try {
            await createOTRequest({
                employeeId: user.employeeId,
                projectId: projectId || undefined,
                otMonth,
                lines: lines.map(l => ({
                    ...l,
                    registrationHours: hoursBetween(l.fromTime, l.toTime),
                })),
            });
            showToast('OT registration submitted');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to submit OT registration', 'error');
        } finally {
            setSaving(false);
        }
    };

    const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
    const inputCls = 'w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="OT Registration / New" width="max-w-5xl">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Status stepper */}
                <ApprovalStepper status="DRAFT" />

                {/* ── Header ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div>
                            <label className={labelCls}>Project</label>
                            <select className={inputCls} value={projectId}
                                onChange={e => setProjectId(e.target.value)}>
                                <option value="">— No project —</option>
                                {projects.map(p => (
                                    <option key={p.projectId} value={p.projectId}>
                                        {p.code ? `${p.code} · ` : ''}{p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Project Manager</label>
                            <input className={`${inputCls} bg-gray-50`} readOnly
                                value={selectedProject?.projectManagerName ?? '—'} />
                        </div>
                        <div>
                            <label className={labelCls}>OT Month</label>
                            <input className={`${inputCls} bg-gray-50`} readOnly value={otMonth} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className={labelCls}>Employee</label>
                            <input className={`${inputCls} bg-gray-50`} readOnly
                                value={user?.username ?? user?.employeeId ?? '—'} />
                        </div>
                        <div>
                            <label className={labelCls}>Manager</label>
                            <input className={`${inputCls} bg-gray-50`} readOnly value="(auto by department)" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Total registration hours</label>
                                <div className={`text-lg font-semibold ${exceedMonthly ? 'text-red-600' : 'text-gray-800'}`}>
                                    {totalHours.toFixed(2)}h
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Monthly limit</label>
                                <div className="text-lg font-semibold text-gray-400">{MAX_MONTHLY_OT_HOURS}h</div>
                            </div>
                        </div>
                    </div>
                </div>

                {exceedMonthly && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        Total OT this month ({totalHours.toFixed(2)}h) exceeds the {MAX_MONTHLY_OT_HOURS}h legal limit.
                    </div>
                )}

                {/* ── OT Request Lines ── */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">OT Request Lines</h3>
                        <button type="button" onClick={addLine}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                            <Plus className="w-4 h-4" /> Add line
                        </button>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-2 py-2 text-left">Date</th>
                                    <th className="px-2 py-2 text-left">From</th>
                                    <th className="px-2 py-2 text-left">To</th>
                                    <th className="px-2 py-2 text-left">Category</th>
                                    <th className="px-2 py-2 text-right">Rate</th>
                                    <th className="px-2 py-2 text-center">WFH</th>
                                    <th className="px-2 py-2 text-right">Hours</th>
                                    <th className="px-2 py-2 text-left">Reason *</th>
                                    <th className="px-2 py-2 text-center">Evidence</th>
                                    <th className="px-2 py-2 text-left">Warning</th>
                                    <th className="px-2 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {lines.map((l, i) => {
                                    const hrs = hoursBetween(l.fromTime, l.toTime);
                                    const warn = lineWarnings[i];
                                    return (
                                        <tr key={i} className="align-top">
                                            <td className="px-2 py-2">
                                                <input type="date" className={inputCls} value={l.workDate}
                                                    onChange={e => updateLine(i, { workDate: e.target.value })} />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="time" className={inputCls} value={l.fromTime}
                                                    onChange={e => updateLine(i, { fromTime: e.target.value })} />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="time" className={inputCls} value={l.toTime}
                                                    onChange={e => updateLine(i, { toTime: e.target.value })} />
                                            </td>
                                            <td className="px-2 py-2">
                                                <select className={inputCls} value={l.otCategory}
                                                    onChange={e => updateLine(i, { otCategory: e.target.value as OTCategory })}>
                                                    <option value="WEEKDAY">Weekday</option>
                                                    <option value="WEEKEND">Weekend</option>
                                                    <option value="HOLIDAY">Holiday</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 text-right text-gray-600 whitespace-nowrap">
                                                ×{OT_RATE_BY_CATEGORY[l.otCategory].toFixed(1)}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <input type="checkbox" checked={l.wfh}
                                                    onChange={e => updateLine(i, { wfh: e.target.checked })} />
                                            </td>
                                            <td className="px-2 py-2 text-right font-medium text-gray-800">
                                                {hrs.toFixed(2)}
                                            </td>
                                            <td className="px-2 py-2 min-w-[160px]">
                                                <input className={inputCls} placeholder="Reason…" value={l.reason}
                                                    onChange={e => updateLine(i, { reason: e.target.value })} />
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-blue-600">
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                    <span className="max-w-[80px] truncate">{l.evidenceName ?? 'Attach'}</span>
                                                    <input type="file" className="hidden"
                                                        onChange={e => updateLine(i, { evidenceName: e.target.files?.[0]?.name })} />
                                                </label>
                                            </td>
                                            <td className="px-2 py-2 text-xs text-red-600 min-w-[120px]">
                                                {warn && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> {warn}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button type="button" onClick={() => removeLine(i)}
                                                    disabled={lines.length === 1}
                                                    className="text-gray-400 hover:text-red-600 disabled:opacity-30">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Discard
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Submitting…' : 'Submit OT Registration'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
