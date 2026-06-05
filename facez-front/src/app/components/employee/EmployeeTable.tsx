"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Edit2Icon, Trash2Icon, UsersIcon } from 'lucide-react';
import { getEmployees, deleteEmployee } from '@/app/services/EmployeeService';
import { EmployeeFormModal } from './EmployeeFormModal';
import { TaxDependentModal } from './TaxDependentModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Employee } from '@/app/commons/types';

interface EmployeeTableProps {
    searchTerm: string;
    refreshKey?: number;
    canWrite?: boolean;
}

export function EmployeeTable({ searchTerm, refreshKey, canWrite = false }: EmployeeTableProps) {
    const { showToast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [editTarget, setEditTarget] = useState<Employee | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [dependentTarget, setDependentTarget] = useState<Employee | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getEmployees(page, 20);
            if (res.success && res.data) {
                setEmployees(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, [page, refreshKey]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = employees.filter(e =>
        (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        try {
            await deleteEmployee(id);
            showToast('Employee deleted');
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    if (loading) return <div className="p-6 text-center text-gray-500">Loading employees...</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            {canWrite && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={canWrite ? 7 : 6} className="px-6 py-8 text-center text-gray-400">No employees found</td></tr>
                        ) : filtered.map(emp => (
                            <tr key={emp.employeeId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.employeeId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{emp.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{emp.role}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.departmentName || '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                        emp.status === 'TERMINATED' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-600'}`}>
                                        {emp.status || 'N/A'}
                                    </span>
                                </td>
                                {canWrite && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setEditTarget(emp)}
                                                className="p-1 text-gray-600 hover:text-blue-600"
                                                title="Edit"
                                            >
                                                <Edit2Icon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDependentTarget(emp)}
                                                className="p-1 text-gray-600 hover:text-violet-600"
                                                title="Tax Dependents"
                                            >
                                                <UsersIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(emp.employeeId)}
                                                className="p-1 text-gray-600 hover:text-red-600"
                                                title="Delete"
                                            >
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50">Previous</button>
                    <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
            )}

            {/* Edit modal */}
            <EmployeeFormModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={fetchData}
                employee={editTarget}
            />

            {/* Tax Dependents modal */}
            {dependentTarget && (
                <TaxDependentModal
                    isOpen={!!dependentTarget}
                    onClose={() => setDependentTarget(null)}
                    employeeId={dependentTarget.employeeId}
                    employeeName={dependentTarget.name}
                />
            )}

            {/* Delete confirm dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Employee</h3>
                        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this employee? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
