"use client";
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { LeaveRequest } from '@/app/commons/types';

const SLICES = [
    { key: 'APPROVED', label: 'Approved', color: '#10b981' },
    { key: 'REJECTED', label: 'Rejected', color: '#ef4444' },
    { key: 'TO_APPROVE', label: 'Pending', color: '#f59e0b' },
    { key: 'DRAFT', label: 'Draft', color: '#9ca3af' },
    { key: 'LEADER_APPROVED', label: 'Leader Approved', color: '#6366f1' },
    { key: 'MANAGER_APPROVED', label: 'Manager Approved', color: '#8b5cf6' },
];

interface Props {
    leaves: LeaveRequest[];
}

export function LeaveApprovalRateChart({ leaves }: Props) {
    const data = SLICES
        .map(s => ({ ...s, value: leaves.filter(l => l.status === s.key).length }))
        .filter(s => s.value > 0);

    const approved = leaves.filter(l => l.status === 'APPROVED').length;
    const decided = leaves.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED').length;
    const rate = decided > 0 ? Math.round((approved / decided) * 100) : null;

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-36 text-sm text-gray-400">No leave data</div>;
    }

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <ResponsiveContainer width={160} height={140}>
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={62}
                            dataKey="value" labelLine={false}>
                            {data.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [`${v} requests`, name]} />
                    </PieChart>
                </ResponsiveContainer>
                {rate !== null && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-800">{rate}%</p>
                            <p className="text-xs text-gray-400">approval</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                {data.map(s => (
                    <div key={s.key} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="w-2 h-2 rounded-full flex-none" style={{ background: s.color }} />
                        {s.label} ({s.value})
                    </div>
                ))}
            </div>
        </div>
    );
}
