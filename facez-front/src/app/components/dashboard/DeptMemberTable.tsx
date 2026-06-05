"use client";
import React from 'react';
import type { Employee } from '@/app/commons/types';

const STATUS_STYLE: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    ON_LEAVE: 'bg-amber-100 text-amber-700',
    INACTIVE: 'bg-gray-100 text-gray-500',
    TERMINATED: 'bg-red-100 text-red-600',
};

interface Props {
    employees: Employee[];
}

export function DeptMemberTable({ employees }: Props) {
    if (employees.length === 0) {
        return <div className="py-6 text-center text-sm text-gray-400">No members in department</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {employees.map(emp => (
                        <tr key={emp.employeeId} className="hover:bg-gray-50">
                            <td className="py-2 pr-3 text-gray-500 text-xs font-mono">{emp.employeeId}</td>
                            <td className="py-2 pr-3 font-medium text-gray-800 text-xs">{emp.name}</td>
                            <td className="py-2 pr-3 text-gray-600 text-xs">{emp.role}</td>
                            <td className="py-2">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLE[emp.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                    {emp.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
