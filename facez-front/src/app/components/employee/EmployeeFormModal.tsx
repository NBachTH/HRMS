"use client";

import React, { useEffect, useState } from 'react';
import { Modal } from '@/app/components/common/Modal';
import { getDepartments } from '@/app/services/DepartmentService';
import { createEmployee, updateEmployee } from '@/app/services/EmployeeService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Employee, Department } from '@/app/commons/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employee?: Employee | null; // null = create mode
}

const ROLES = ['EMPLOYEE', 'MANAGER', 'LEADER', 'HR_ADMIN', 'SYSTEM_ADMIN'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

export function EmployeeFormModal({ isOpen, onClose, onSuccess, employee }: Props) {
    const { showToast } = useToast();
    const isEdit = !!employee;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        employeeId: '',
        name: '',
        username: '',
        password: '',
        email: '',
        role: 'EMPLOYEE',
        departmentId: '',
        phoneNumber: '',
        address: '',
        dateOfJoining: '',
        emergencyContact: '',
        status: 'ACTIVE',
    });

    // Load departments for dropdown
    useEffect(() => {
        if (!isOpen) return;
        getDepartments().then(res => {
            if (res.success && res.data) setDepartments(res.data);
        }).catch(() => {});
    }, [isOpen]);

    // Pre-fill form when editing
    useEffect(() => {
        if (employee) {
            setForm({
                employeeId: employee.employeeId ?? '',
                name: employee.name ?? '',
                username: employee.username ?? '',
                password: '',
                email: employee.email ?? '',
                role: employee.role ?? 'EMPLOYEE',
                departmentId: employee.departmentId ?? '',
                phoneNumber: employee.phoneNumber ?? '',
                address: employee.address ?? '',
                dateOfJoining: employee.dateOfJoining ?? '',
                emergencyContact: employee.emergencyContact ?? '',
                status: employee.status ?? 'ACTIVE',
            });
        } else {
            setForm({
                employeeId: '', name: '', username: '', password: '', email: '',
                role: 'EMPLOYEE', departmentId: '', phoneNumber: '', address: '',
                dateOfJoining: '', emergencyContact: '', status: 'ACTIVE',
            });
        }
        setErrors({});
    }, [employee, isOpen]);

    const set = (field: string, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.email.trim()) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
        if (!isEdit) {
            if (!form.employeeId.trim()) errs.employeeId = 'Employee ID is required';
            if (!form.username.trim()) errs.username = 'Username is required';
            if (!form.password.trim()) errs.password = 'Password is required';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            if (isEdit && employee) {
                await updateEmployee(employee.employeeId, {
                    name: form.name,
                    email: form.email,
                    role: form.role as any,
                    departmentId: form.departmentId || undefined,
                    phoneNumber: form.phoneNumber || undefined,
                    address: form.address || undefined,
                    dateOfJoining: form.dateOfJoining || undefined,
                    emergencyContact: form.emergencyContact || undefined,
                    status: form.status as any,
                });
                showToast('Employee updated successfully');
            } else {
                await createEmployee({
                    employeeId: form.employeeId,
                    name: form.name,
                    username: form.username,
                    password: form.password,
                    email: form.email,
                    role: form.role as any,
                    departmentId: form.departmentId || undefined,
                    phoneNumber: form.phoneNumber || undefined,
                    address: form.address || undefined,
                    dateOfJoining: form.dateOfJoining || undefined,
                    emergencyContact: form.emergencyContact || undefined,
                });
                showToast('Employee created successfully');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to save employee', 'error');
        } finally {
            setSaving(false);
        }
    };

    const field = (label: string, key: string, type = 'text', required = false) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type={type}
                value={(form as any)[key]}
                onChange={e => set(key, e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                    ${errors[key] ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'} width="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {!isEdit && field('Employee ID', 'employeeId', 'text', true)}
                    {field('Full Name', 'name', 'text', true)}
                    {field('Email', 'email', 'email', true)}
                    {!isEdit && field('Username', 'username', 'text', true)}
                    {!isEdit && field('Password', 'password', 'password', true)}
                    {field('Phone Number', 'phoneNumber')}
                    {field('Date of Joining', 'dateOfJoining', 'date')}
                    {field('Emergency Contact', 'emergencyContact')}
                </div>

                {field('Address', 'address')}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={form.role}
                            onChange={e => set('role', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                            value={form.departmentId}
                            onChange={e => set('departmentId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">— None —</option>
                            {departments.map(d => (
                                <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
                            ))}
                        </select>
                    </div>
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={form.status}
                                onChange={e => set('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Create Employee'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
