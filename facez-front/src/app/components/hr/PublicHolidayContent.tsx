"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheckIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { getByYear, createHoliday, deleteHoliday } from '@/app/services/PublicHolidayService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { PublicHoliday } from '@/app/commons/types';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';

function AddHolidayModal({ isOpen, onClose, onSuccess, year }: {
    isOpen: boolean; onClose: () => void; onSuccess: () => void; year: number;
}) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', holidayDate: '', compensatoryDay: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) { setForm({ name: '', holidayDate: '', compensatoryDay: '' }); setErrors({}); }
    }, [isOpen]);

    const set = (field: string, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Holiday name is required';
        if (!form.holidayDate) errs.holidayDate = 'Date is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await createHoliday({
                holidayYear: year,
                name: form.name.trim(),
                holidayDate: form.holidayDate,
                compensatoryDay: form.compensatoryDay || undefined,
            });
            showToast('Holiday added');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to add holiday', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Public Holiday" width="max-w-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Holiday Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="e.g. National Day"
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                            ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Holiday Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={form.holidayDate}
                        onChange={e => set('holidayDate', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                            ${errors.holidayDate ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {errors.holidayDate && <p className="text-xs text-red-500 mt-1">{errors.holidayDate}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compensatory Day <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                        type="date"
                        value={form.compensatoryDay}
                        onChange={e => set('compensatoryDay', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Add Holiday'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export function PublicHolidayContent() {
    const { showToast } = useToast();
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [showAdd, setShowAdd] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getByYear(year);
            if (res.success && res.data) {
                const data = Array.isArray(res.data) ? res.data : ((res.data as any).content ?? []);
                setHolidays(data.sort((a: PublicHoliday, b: PublicHoliday) =>
                    a.holidayDate.localeCompare(b.holidayDate)));
            }
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load holidays', 'error');
        } finally {
            setLoading(false);
        }
    }, [year, showToast]);

    useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

    const handleDelete = async (id: string) => {
        try {
            await deleteHoliday(id);
            showToast('Holiday deleted');
            setDeleteId(null);
            fetchHolidays();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    });

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-3">
                        <CalendarCheckIcon className="w-7 h-7 text-blue-600" /> Public Holidays
                    </h1>
                    <p className="text-sm text-gray-500">HR / Public Holidays</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={year} onChange={e => setYear(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                        <PlusIcon className="w-4 h-4" /> Add Holiday
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">
                        {holidays.length} public holidays for {year}
                    </p>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading…</div>
                ) : holidays.length === 0 ? (
                    <div className="p-12 text-center">
                        <CalendarCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No holidays found for {year}</p>
                        <p className="text-sm text-gray-400 mt-1">Click "Add Holiday" to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {holidays.map(h => (
                            <div key={h.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center justify-center">
                                        <span className="text-xs text-blue-600 font-medium leading-none">
                                            {new Date(h.holidayDate).toLocaleDateString('en', { month: 'short' })}
                                        </span>
                                        <span className="text-xl font-bold text-blue-900 leading-none">
                                            {new Date(h.holidayDate).getDate()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{h.name}</p>
                                        <p className="text-sm text-gray-500">{formatDate(h.holidayDate)}</p>
                                        {h.compensatoryDay && (
                                            <p className="text-xs text-green-600 mt-0.5">
                                                Compensatory: {formatDate(h.compensatoryDay)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDeleteId(h.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete holiday"
                                >
                                    <Trash2Icon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddHolidayModal
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                onSuccess={fetchHolidays}
                year={year}
            />
            <ConfirmDialog
                open={!!deleteId}
                title="Delete Holiday"
                message="Are you sure you want to delete this holiday?"
                onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
                onCancel={() => setDeleteId(null)}
                danger
            />
        </div>
    );
}
