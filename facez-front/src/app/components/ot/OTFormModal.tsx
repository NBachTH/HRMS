"use client";

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/app/components/common/Modal';
import { createOTRequest } from '@/app/services/OTRequestService';
import { getMyApprovedOTPlans } from '@/app/services/OTPlanService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { OTPlan } from '@/app/commons/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const hhmm = (t?: string) => (t ? t.slice(0, 5) : '');

export function OTFormModal({ isOpen, onClose, onSuccess }: Props) {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [plans, setPlans] = useState<OTPlan[]>([]);
    const [otPlanId, setOtPlanId] = useState('');
    const [actualStart, setActualStart] = useState('');
    const [actualEnd, setActualEnd] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setOtPlanId(''); setActualStart(''); setActualEnd(''); setError('');
        getMyApprovedOTPlans()
            .then(res => setPlans(Array.isArray(res.data) ? res.data : []))
            .catch(() => setPlans([]));
    }, [isOpen]);

    const selectedPlan = plans.find(p => p.id === otPlanId);

    // Pre-fill the actual times from the plan's date + planned window when a plan is picked.
    const onSelectPlan = (id: string) => {
        setOtPlanId(id);
        setError('');
        const plan = plans.find(p => p.id === id);
        if (plan) {
            const s = hhmm(plan.plannedStartTime) || '18:00';
            const e = hhmm(plan.plannedEndTime) || '20:00';
            setActualStart(`${plan.otDate}T${s}`);
            setActualEnd(`${plan.otDate}T${e}`);
        }
    };

    const validate = () => {
        if (!otPlanId) { setError('Please select an approved OT plan'); return false; }
        if (!actualStart || !actualEnd) { setError('Actual start and end time are required'); return false; }
        if (actualEnd <= actualStart) { setError('End time must be after start time'); return false; }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await createOTRequest({
                employeeId: user?.employeeId,   // server derives identity from the JWT; this is ignored
                otPlanId,
                actualStartTime: actualStart.length === 16 ? actualStart + ':00' : actualStart,
                actualEndTime: actualEnd.length === 16 ? actualEnd + ':00' : actualEnd,
            });
            showToast('OT request logged and approved');
            onSuccess();
            onClose();
        } catch (err: any) {
            // Validation failures (plan / attendance / limits / overlap) arrive here.
            showToast(err?.body?.message || 'Failed to log OT request', 'error');
            setError(err?.body?.message || '');
        } finally {
            setSaving(false);
        }
    };

    const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
    const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log OT Request">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                    <Info className="w-4 h-4 mt-0.5 flex-none" />
                    Log your actual OT against an approved plan. The system validates the times against
                    your attendance for that day; if everything checks out it is approved automatically.
                </div>

                <div>
                    <label className={labelCls}>OT Plan <span className="text-red-500">*</span></label>
                    <select className={inputCls} value={otPlanId} onChange={e => onSelectPlan(e.target.value)}>
                        <option value="">— Select an approved plan —</option>
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.otDate} · {hhmm(p.plannedStartTime) || '—'}–{hhmm(p.plannedEndTime) || '—'}
                                {p.reason ? ` · ${p.reason}` : ''}
                            </option>
                        ))}
                    </select>
                    {plans.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                            No approved OT plan assigned to you. Ask your leader to create one.
                        </p>
                    )}
                </div>

                {selectedPlan && (
                    <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
                        Planned window: <span className="font-medium">{selectedPlan.otDate}</span>{' '}
                        {hhmm(selectedPlan.plannedStartTime) || '—'} – {hhmm(selectedPlan.plannedEndTime) || '—'}
                        {' '}(actual end may exceed planned end by up to 30 min).
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Actual Start <span className="text-red-500">*</span></label>
                        <input type="datetime-local" className={inputCls} value={actualStart}
                            onChange={e => { setActualStart(e.target.value); setError(''); }} />
                    </div>
                    <div>
                        <label className={labelCls}>Actual End <span className="text-red-500">*</span></label>
                        <input type="datetime-local" className={inputCls} value={actualEnd}
                            onChange={e => { setActualEnd(e.target.value); setError(''); }} />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving || plans.length === 0}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Submitting…' : 'Log OT'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
