"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getDepartmentById } from '@/app/services/DepartmentService';
import { getEmployees } from '@/app/services/EmployeeService';
import { ArrowLeftIcon, BuildingIcon, UserIcon } from 'lucide-react';
import type { Department, Employee } from '@/app/commons/types';

const STATUS_STYLES: Record<string, string> = {
    ACTIVE:     'bg-green-100 text-green-700',
    INACTIVE:   'bg-gray-100 text-gray-600',
    ON_LEAVE:   'bg-yellow-100 text-yellow-700',
    TERMINATED: 'bg-red-100 text-red-700',
};

const ROLE_STYLES: Record<string, string> = {
    EMPLOYEE:     'bg-blue-100 text-blue-700',
    MANAGER:      'bg-purple-100 text-purple-700',
    LEADER:       'bg-indigo-100 text-indigo-700',
    HR_ADMIN:     'bg-orange-100 text-orange-700',
    SYSTEM_ADMIN: 'bg-red-100 text-red-700',
};

interface Props {
    departmentId: string;
}

export function DepartmentDetailContent({ departmentId }: Props) {
    const router = useRouter();

    const [department, setDepartment] = useState<Department | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchEmployees = useCallback(async (p: number) => {
        try {
            const res = await getEmployees(p, 20, departmentId);
            if (res.success && res.data) {
                setEmployees(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load employees');
        }
    }, [departmentId]);

    useEffect(() => {
        async function init() {
            setLoading(true);
            setError(null);
            try {
                const deptRes = await getDepartmentById(departmentId);
                if (deptRes.success) setDepartment(deptRes.data);
                await fetchEmployees(0);
            } catch (err: any) {
                setError(err?.body?.message || 'Failed to load department');
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [departmentId, fetchEmployees]);

    const handlePageChange = (p: number) => {
        setPage(p);
        fetchEmployees(p);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
    if (error)   return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!department) return null;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4"
                >
                    <ArrowLeftIcon className="w-4 h-4" /> Back
                </button>
                <h1 className="text-3xl font-bold text-blue-900 mb-1">{department.departmentName}</h1>
                <p className="text-sm text-gray-500">HR / Departments / {department.departmentName}</p>
            </div>

            {/* Department info card */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <BuildingIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">Department Info</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Department ID</p>
                        <p className="text-sm text-gray-900 font-mono">{department.departmentId}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Manager</p>
                        <p className="text-sm text-gray-900">{department.managerName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Parent Department</p>
                        <p className="text-sm text-gray-900">{department.parentId || '—'}</p>
                    </div>
                </div>
            </div>

            {/* Employees table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                    <h2 className="text-xl font-semibold text-gray-800">
                        Employees
                        {employees.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500">({employees.length} shown)</span>
                        )}
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                        No employees in this department
                                    </td>
                                </tr>
                            ) : employees.map((emp, i) => (
                                <tr key={emp.employeeId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-500">{i + 1 + page * 20}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{emp.name}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[emp.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {emp.role?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{emp.email}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{emp.phoneNumber || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[emp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {emp.status?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                        <button
                            disabled={page === 0}
                            onClick={() => handlePageChange(page - 1)}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => handlePageChange(page + 1)}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
