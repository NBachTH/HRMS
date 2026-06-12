"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/app/components/common/Modal';
import { createAdjustment } from '@/app/services/AttendanceAdjustmentService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import {useAuth} from "@/app/commons/contexts/AuthContext";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultDate?: string;   // yyyy-MM-dd to prefill when opened from a calendar cell
}

export function AttendanceAdjustmentModal({ isOpen, onClose, onSuccess, defaultDate }: Props) {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ workDate: '', checkIn: '08:30', checkOut: '17:30', reason: '' });

    useEffect(() => {
        if (!isOpen) return;
        setForm({
            workDate: defaultDate || new Date().toISOString().slice(0, 10),
            checkIn: '08:30', checkOut: '17:30', reason: '',
        });
        setError('');
    }, [isOpen, defaultDate]);

    const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.workDate) { setError('Ngày là bắt buộc'); return; }
        if (!form.checkIn && !form.checkOut) { setError('Cần ít nhất giờ vào hoặc giờ ra'); return; }
        if (!form.reason.trim()) { setError('Lý do là bắt buộc'); return; }
        setSaving(true);
        try {
            await createAdjustment({
                employeeId: user?.employeeId,
                workDate: form.workDate,
                requestedCheckIn: form.checkIn ? `${form.workDate}T${form.checkIn}:00` : undefined,
                requestedCheckOut: form.checkOut ? `${form.workDate}T${form.checkOut}:00` : undefined,
                reason: form.reason,
            });
            showToast('Đã gửi đơn bổ sung chấm công');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Gửi đơn thất bại', 'error');
            setError(err?.body?.message || '');
        } finally {
            setSaving(false);
        }
    };

    const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
    const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bổ sung chấm công">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className={labelCls}>Ngày <span className="text-red-500">*</span></label>
                    <input type="date" className={inputCls} value={form.workDate}
                        onChange={e => set('workDate', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Giờ vào</label>
                        <input type="time" className={inputCls} value={form.checkIn}
                            onChange={e => set('checkIn', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Giờ ra</label>
                        <input type="time" className={inputCls} value={form.checkOut}
                            onChange={e => set('checkOut', e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Lý do <span className="text-red-500">*</span></label>
                    <textarea rows={3} className={`${inputCls} resize-none`} value={form.reason}
                        placeholder="Vd: Quên chấm công ra, thiết bị lỗi…"
                        onChange={e => set('reason', e.target.value)} />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Hủy
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Đang gửi…' : 'Gửi đơn'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
