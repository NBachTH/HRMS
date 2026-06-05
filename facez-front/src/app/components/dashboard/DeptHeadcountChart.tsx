"use client";
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

export interface DeptCount {
    deptName: string;
    count: number;
}

interface Props {
    data: DeptCount[];
    loading?: boolean;
}

export function DeptHeadcountChart({ data, loading }: Props) {
    if (loading) {
        return <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading…</div>;
    }
    if (data.length === 0) {
        return <div className="flex items-center justify-center h-48 text-sm text-gray-400">No departments</div>;
    }

    const sorted = [...data].sort((a, b) => b.count - a.count);
    const chartH = Math.max(160, sorted.length * 36);

    return (
        <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="deptName" width={110}
                    tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [`${v} employees`, 'Headcount']} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={20}>
                    {sorted.map((_, i) => <Cell key={i} fill="#6366f1" fillOpacity={1 - i * 0.05} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
