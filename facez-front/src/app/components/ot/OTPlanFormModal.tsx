"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/app/components/common/Modal';
import { createOTPlan } from '@/app/services/OTPlanService';
import { getEmployees } from '@/app/services/EmployeeService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Employee } from '@/app/commons/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function OTPlanFormModal({ isOpen, onClose, onSuccess }: Props) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        otDate: '',
        plannedStartTime: '18:00',
        plannedEndTime: '20:00',
        reason: '',
    });
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isOpen) return;
        const today = new Date().toISOString().slice(0, 10);
        setForm({ otDate: today, plannedStartTime: '18:00', plannedEndTime: '20:00', reason: '' });
        setSelected(new Set());
        setSearch('');
        setError('');
        getEmployees(0, 200)
            .then(res => {
                const items = Array.isArray(res.data) ? res.data : ((res.data as any)?.content ?? []);
                setEmployees(items);
            })
            .catch(() => setEmployees([]));
    }, [isOpen]);

    const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(e =>
            (e.name || '').toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q));
    }, [employees, search]);

    const toggle = (id: string) => {
        setSelected(s => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const validate = () => {
        if (!form.otDate) { setError('OT date is required'); return false; }
        if (form.plannedStartTime && form.plannedEndTime && form.plannedEndTime <= form.plannedStartTime) {
            setError('Planned end must be after planned start'); return false;
        }
        if (selected.size === 0) { setError('Select at least one employee'); return false; }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await createOTPlan({
                otDate: form.otDate,
                plannedStartTime: form.plannedStartTime || undefined,
                plannedEndTime: form.plannedEndTime || undefined,
                reason: form.reason || undefined,
                employeeIds: Array.from(selected),
            });
            showToast('OT plan created — pending manager approval');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to create OT plan', 'error');
        } finally {
            setSaving(false);
        }
    };

    const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
    const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New OT Plan" width="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>OT Date <span className="text-red-500">*</span></label>
                        <input type="date" className={inputCls} value={form.otDate}
                            onChange={e => set('otDate', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Planned Start</label>
                        <input type="time" className={inputCls} value={form.plannedStartTime}
                            onChange={e => set('plannedStartTime', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Planned End</label>
                        <input type="time" className={inputCls} value={form.plannedEndTime}
                            onChange={e => set('plannedEndTime', e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Reason</label>
                    <input className={inputCls} placeholder="e.g. Sprint release" value={form.reason}
                        onChange={e => set('reason', e.target.value)} />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className={labelCls}>Employees <span className="text-red-500">*</span></label>
                        <span className="text-xs text-gray-500">{selected.size} selected</span>
                    </div>
                    <input className={`${inputCls} mb-2`} placeholder="Search by name or ID…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-400">No employees</div>
                        ) : filtered.map(emp => (
                            <label key={emp.employeeId}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                <input type="checkbox" checked={selected.has(emp.employeeId)}
                                    onChange={() => toggle(emp.employeeId)} />
                                <span className="text-sm text-gray-800">{emp.name || emp.employeeId}</span>
                                <span className="text-xs text-gray-400 ml-auto">{emp.employeeId}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Creating…' : 'Create Plan'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
