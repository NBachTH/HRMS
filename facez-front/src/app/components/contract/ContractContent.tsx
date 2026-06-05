"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Edit2Icon, Trash2Icon, AlertTriangleIcon } from 'lucide-react';
import { getContracts, getExpiringSoon, createContract, updateContract, deleteContract } from '@/app/services/ContractService';
import { getEmployees } from '@/app/services/EmployeeService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { Contract, Employee } from '@/app/commons/types';

const CONTRACT_TYPES = ['PROBATION', 'FULLTIME', 'PARTTIME'];
const CONTRACT_STATUSES = ['ACTIVE', 'EXPIRED', 'TERMINATED'];

interface ContractFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contract?: Contract | null;
    employees: Employee[];
}

function ContractFormModal({ isOpen, onClose, onSuccess, contract, employees }: ContractFormProps) {
    const { showToast } = useToast();
    const isEdit = !!contract;
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        employeeId: '',
        contractType: 'FULLTIME',
        startDate: '',
        endDate: '',
        terms: '',
        salaryRank: '',
        status: 'ACTIVE',
    });

    useEffect(() => {
        if (contract) {
            setForm({
                employeeId: contract.employeeId ?? '',
                contractType: contract.contractType ?? 'FULLTIME',
                startDate: contract.startDate ?? '',
                endDate: contract.endDate ?? '',
                terms: contract.terms ?? '',
                salaryRank: contract.salaryRank?.toString() ?? '',
                status: contract.status ?? 'ACTIVE',
            });
        } else {
            setForm({ employeeId: '', contractType: 'FULLTIME', startDate: '', endDate: '', terms: '', salaryRank: '', status: 'ACTIVE' });
        }
        setErrors({});
    }, [contract, isOpen]);

    const set = (field: string, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.employeeId) errs.employeeId = 'Employee is required';
        if (!form.contractType) errs.contractType = 'Contract type is required';
        if (!form.startDate) errs.startDate = 'Start date is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                employeeId: form.employeeId,
                contractType: form.contractType,
                startDate: form.startDate,
                endDate: form.endDate || undefined,
                terms: form.terms || undefined,
                salaryRank: form.salaryRank || undefined,
                status: form.status || undefined,
            };
            if (isEdit && contract) {
                await updateContract(contract.id, payload);
                showToast('Contract updated');
            } else {
                await createContract(payload);
                showToast('Contract created');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to save contract', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Contract' : 'New Contract'} width="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={form.employeeId}
                        onChange={e => set('employeeId', e.target.value)}
                        disabled={isEdit}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contract Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.contractType}
                            onChange={e => set('contractType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={form.status}
                            onChange={e => set('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={e => set('startDate', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                                ${errors.startDate ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={form.endDate}
                            onChange={e => set('endDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Salary Rank</label>
                        <input
                            type="number"
                            value={form.salaryRank}
                            onChange={e => set('salaryRank', e.target.value)}
                            placeholder="e.g. 1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
                    <textarea
                        rows={3}
                        value={form.terms}
                        onChange={e => set('terms', e.target.value)}
                        placeholder="Contract terms and conditions..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : isEdit ? 'Update Contract' : 'Create Contract'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

type ViewTab = 'all' | 'expiring';

export function ContractContent() {
    const { showToast } = useToast();
    const { role } = useAuth();
    const canWrite = role === 'HR_ADMIN';
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Contract | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<ViewTab>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [contractsRes, empRes] = await Promise.all([
                activeTab === 'expiring' ? getExpiringSoon(30) : getContracts(),
                getEmployees(0, 100),
            ]);
            if (contractsRes.success && contractsRes.data) setContracts(Array.isArray(contractsRes.data) ? contractsRes.data : ((contractsRes.data as any)?.content ?? []));
            if (empRes.success && empRes.data) setEmployees(empRes.data.content);
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load contracts');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string) => {
        try {
            await deleteContract(id);
            showToast('Contract deleted');
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            ACTIVE: 'bg-green-100 text-green-800',
            EXPIRED: 'bg-gray-100 text-gray-600',
            TERMINATED: 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
                {status}
            </span>
        );
    };

    const filtered = contracts.filter(c =>
        (c.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.contractType || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">Contracts</h1>
                    <p className="text-sm text-gray-500">HR / Contracts</p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        New Contract
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 text-sm rounded-md font-medium transition-colors
                        ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>
                    All Contracts
                </button>
                <button
                    onClick={() => setActiveTab('expiring')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md font-medium transition-colors
                        ${activeTab === 'expiring' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-300 hover:bg-amber-50'}`}>
                    <AlertTriangleIcon className="w-3.5 h-3.5" /> Expiring in 30 Days
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {activeTab === 'expiring' ? 'Expiring Contracts (next 30 days)' : 'All Contracts'}
                    </h2>
                    <div className="w-64">
                        <input
                            type="text"
                            placeholder="Search by employee or type..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary Rank</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    {canWrite && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={canWrite ? 7 : 6} className="px-6 py-8 text-center text-gray-400">No contracts found</td></tr>
                                ) : filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                            {c.employeeName || c.employeeId}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{c.contractType}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{c.startDate || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{c.endDate || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{c.salaryRank ?? '—'}</td>
                                        <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                                        {canWrite && (
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={() => setEditTarget(c)}
                                                        className="p-1 text-gray-600 hover:text-blue-600" title="Edit">
                                                        <Edit2Icon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteConfirm(c.id)}
                                                        className="p-1 text-gray-600 hover:text-red-600" title="Delete">
                                                        <Trash2Icon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ContractFormModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={fetchData}
                contract={null}
                employees={employees}
            />
            <ContractFormModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={fetchData}
                contract={editTarget}
                employees={employees}
            />

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Contract</h3>
                        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this contract?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
