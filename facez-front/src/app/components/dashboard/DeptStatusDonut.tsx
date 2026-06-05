"use client";
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Employee } from '@/app/commons/types';

const SLICES = [
    { key: 'ACTIVE', label: 'Active', color: '#10b981' },
    { key: 'ON_LEAVE', label: 'On Leave', color: '#f59e0b' },
    { key: 'INACTIVE', label: 'Inactive', color: '#9ca3af' },
    { key: 'TERMINATED', label: 'Terminated', color: '#ef4444' },
];

interface Props {
    employees: Employee[];
}

export function DeptStatusDonut({ employees }: Props) {
    const data = SLICES
        .map(s => ({ ...s, value: employees.filter(e => e.status === s.key).length }))
        .filter(s => s.value > 0);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-36 text-sm text-gray-400">No data</div>;
    }

    return (
        <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                        dataKey="value" labelLine={false}>
                        {data.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${v} employees`, name]} />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                {data.map(s => (
                    <div key={s.key} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: s.color }} />
                        {s.label} ({s.value})
                    </div>
                ))}
            </div>
        </div>
    );
}
