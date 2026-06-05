"use client";
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LeaveRequest, OTRequest } from '@/app/commons/types';

const STATUS_COLORS: Record<string, string> = {
    TO_APPROVE: '#f59e0b',
    LEADER_APPROVED: '#6366f1',
    MANAGER_APPROVED: '#8b5cf6',
    APPROVED: '#10b981',
    REJECTED: '#ef4444',
    DRAFT: '#9ca3af',
};

function countByStatus(items: { status: string }[]) {
    const counts: Record<string, number> = {};
    for (const item of items) {
        counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));
}

interface Props {
    leaves: LeaveRequest[];
    otRequests: OTRequest[];
}

export function RequestStatusPieChart({ leaves, otRequests }: Props) {
    const leaveData = countByStatus(leaves);
    const otData = countByStatus(otRequests);

    const isEmpty = leaveData.length === 0 && otData.length === 0;
    if (isEmpty) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                No request data
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            {[{ label: 'Leave', data: leaveData }, { label: 'OT', data: otData }].map(({ label, data }) => (
                <div key={label}>
                    <p className="text-xs font-medium text-gray-500 text-center mb-1">{label}</p>
                    {data.length === 0 ? (
                        <div className="flex items-center justify-center h-28 text-xs text-gray-400">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={120}>
                            <PieChart>
                                <Pie data={data} cx="50%" cy="50%" outerRadius={45} dataKey="value" labelLine={false}>
                                    {data.map((entry, i) => (
                                        <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#9ca3af'} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number, name: string) => [`${v}`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            ))}
            {/* Shared legend */}
            <div className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                    const total = (leaveData.find(d => d.name === status)?.value ?? 0)
                        + (otData.find(d => d.name === status)?.value ?? 0);
                    if (total === 0) return null;
                    return (
                        <div key={status} className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="w-2 h-2 rounded-full flex-none" style={{ background: color }} />
                            {status.replace('_', ' ')}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
