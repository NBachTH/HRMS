"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getDepartments, deleteDepartment } from '@/app/services/DepartmentService';
import { DepartmentFormModal } from './DepartmentFormModal';
import { Trash2Icon, Edit2Icon, EyeIcon } from 'lucide-react';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { Department } from '@/app/commons/types';

export function DepartmentContent() {
    const { showToast } = useToast();
    const { role } = useAuth();
    const router = useRouter();
    const isHR = role === 'HR_ADMIN';
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getDepartments();
            if (res.success && res.data) setDepartments(res.data);
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load departments');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string) => {
        try {
            await deleteDepartment(id);
            showToast('Department deleted');
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">Departments</h1>
                    <p className="text-sm text-gray-500">Manager / Departments</p>
                </div>
                {isHR && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Add Department
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {departments.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No departments</td></tr>
                                ) : departments.map(dept => (
                                    <tr key={dept.departmentId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{dept.departmentId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{dept.departmentName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{dept.managerName || '—'}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center space-x-2">
                                                {isHR ? (
                                                    <>
                                                        <button
                                                            onClick={() => router.push(`/hr/department/${dept.departmentId}`)}
                                                            className="p-1 text-gray-600 hover:text-blue-600" title="View detail">
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditTarget(dept)}
                                                            className="p-1 text-gray-600 hover:text-blue-600" title="Edit">
                                                            <Edit2Icon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(dept.departmentId)}
                                                            className="p-1 text-gray-600 hover:text-red-600" title="Delete">
                                                            <Trash2Icon className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <DepartmentFormModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={fetchData}
                department={null}
            />

            <DepartmentFormModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={fetchData}
                department={editTarget}
            />

            {/* Delete confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Department</h3>
                        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this department?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
