"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PlusIcon, Edit2Icon, Trash2Icon, UsersIcon } from 'lucide-react';
import { getByEmployee, createDependent, updateDependent, deleteDependent } from '@/app/services/TaxDependentService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { formatDate } from '@/app/commons/utils/formatters';
import type { TaxDependent, TaxDependentRequest } from '@/app/commons/types';

interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: string;
    dependent?: TaxDependent | null;
}

function DependentFormModal({ isOpen, onClose, onSuccess, employeeId, dependent }: FormModalProps) {
    const { showToast } = useToast();
    const isEdit = !!dependent;
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ fullName: '', nationalId: '', dateOfBirth: '', relationship: '', registrationDate: '' });

    useEffect(() => {
        if (isOpen) {
            setForm({
                fullName: dependent?.fullName || '',
                nationalId: dependent?.nationalId || '',
                dateOfBirth: dependent?.dateOfBirth || '',
                relationship: dependent?.relationship || '',
                registrationDate: dependent?.registrationDate || '',
            });
        }
    }, [isOpen, dependent]);

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fullName || !form.relationship) {
            showToast('Full name and relationship are required', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload: TaxDependentRequest = {
                employeeId,
                fullName: form.fullName,
                relationship: form.relationship,
                nationalId: form.nationalId || undefined,
                dateOfBirth: form.dateOfBirth || undefined,
                registrationDate: form.registrationDate || undefined,
            };
            if (isEdit && dependent) {
                await updateDependent(dependent.id, payload);
                showToast('Dependent updated');
            } else {
                await createDependent(payload);
                showToast('Dependent added');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to save dependent', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Dependent' : 'Add Dependent'} width="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship <span className="text-red-500">*</span></label>
                        <input type="text" value={form.relationship} onChange={e => set('relationship', e.target.value)}
                            placeholder="e.g. Child, Spouse"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                        <input type="text" value={form.nationalId} onChange={e => set('nationalId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                        <input type="date" value={form.registrationDate} onChange={e => set('registrationDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

interface TaxDependentModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    employeeName: string;
}

export function TaxDependentModal({ isOpen, onClose, employeeId, employeeName }: TaxDependentModalProps) {
    const { showToast } = useToast();
    const [dependents, setDependents] = useState<TaxDependent[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<TaxDependent | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const res = await getByEmployee(employeeId);
            if (res.success && res.data) setDependents(res.data);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load dependents', 'error');
        } finally {
            setLoading(false);
        }
    }, [employeeId, showToast]);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    const handleDelete = async (id: string) => {
        try {
            await deleteDependent(id);
            showToast('Dependent removed');
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose}
                title={`Tax Dependents — ${employeeName}`}
                width="max-w-2xl">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">{dependents.length} dependent(s) registered</p>
                        <button onClick={() => { setEditTarget(null); setShowForm(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            <PlusIcon className="w-3.5 h-3.5" /> Add Dependent
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center text-gray-400">Loading…</div>
                    ) : dependents.length === 0 ? (
                        <div className="py-8 text-center">
                            <UsersIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No tax dependents registered</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Relationship</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">National ID</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">DOB</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                        <th className="px-4 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {dependents.map(d => (
                                        <tr key={d.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium">{d.fullName}</td>
                                            <td className="px-4 py-2 text-gray-600">{d.relationship}</td>
                                            <td className="px-4 py-2 text-gray-500">{d.nationalId || '—'}</td>
                                            <td className="px-4 py-2 text-gray-500">{formatDate(d.dateOfBirth)}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                                    ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {d.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => { setEditTarget(d); setShowForm(true); }}
                                                        className="p-1 text-gray-400 hover:text-blue-600" title="Edit">
                                                        <Edit2Icon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(d.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                                                        <Trash2Icon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {deleteConfirm && (
                        <div className="border border-red-200 bg-red-50 rounded-md p-4">
                            <p className="text-sm text-red-700 mb-3">Remove this dependent?</p>
                            <div className="flex gap-2">
                                <button onClick={() => setDeleteConfirm(null)}
                                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                <button onClick={() => handleDelete(deleteConfirm)}
                                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700">Remove</button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <DependentFormModal
                isOpen={showForm}
                onClose={() => { setShowForm(false); setEditTarget(null); }}
                onSuccess={fetchData}
                employeeId={employeeId}
                dependent={editTarget}
            />
        </>
    );
}
