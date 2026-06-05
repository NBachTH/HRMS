"use client";

import React, { useEffect, useState } from 'react';
import { Modal } from '@/app/components/common/Modal';
import { getEmployees } from '@/app/services/EmployeeService';
import { createDepartment, updateDepartment } from '@/app/services/DepartmentService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Department, Employee } from '@/app/commons/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    department?: Department | null;
}

export function DepartmentFormModal({ isOpen, onClose, onSuccess, department }: Props) {
    const { showToast } = useToast();
    const isEdit = !!department;

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        departmentId: '',
        departmentName: '',
        managerId: '',
    });

    useEffect(() => {
        if (!isOpen) return;
        // Load first 100 employees for manager dropdown
        getEmployees(0, 100).then(res => {
            if (res.success && res.data) setEmployees(res.data.content);
        }).catch(() => {});
    }, [isOpen]);

    useEffect(() => {
        if (department) {
            setForm({
                departmentId: department.departmentId ?? '',
                departmentName: department.departmentName ?? '',
                managerId: department.managerId ?? '',
            });
        } else {
            setForm({ departmentId: '', departmentName: '', managerId: '' });
        }
        setErrors({});
    }, [department, isOpen]);

    const set = (field: string, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.departmentName.trim()) errs.departmentName = 'Department name is required';
        if (!isEdit && !form.departmentId.trim()) errs.departmentId = 'Department ID is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            if (isEdit && department) {
                await updateDepartment(department.departmentId, {
                    departmentId: department.departmentId,
                    departmentName: form.departmentName,
                    managerId: form.managerId || undefined,
                });
                showToast('Department updated successfully');
            } else {
                await createDepartment({
                    departmentId: form.departmentId,
                    departmentName: form.departmentName,
                    managerId: form.managerId || undefined,
                });
                showToast('Department created successfully');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to save department', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Department' : 'Add Department'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isEdit && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.departmentId}
                            onChange={e => set('departmentId', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                                ${errors.departmentId ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {errors.departmentId && <p className="text-xs text-red-500 mt-1">{errors.departmentId}</p>}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.departmentName}
                        onChange={e => set('departmentName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                            ${errors.departmentName ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {errors.departmentName && <p className="text-xs text-red-500 mt-1">{errors.departmentName}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                    <select
                        value={form.managerId}
                        onChange={e => set('managerId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">— No manager —</option>
                        {employees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                                {emp.name} ({emp.employeeId})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : isEdit ? 'Update Department' : 'Create Department'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
