"use client";
import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface TrendPoint {
    year: number;
    month: number;
    totalNet: number;
    count: number;
}

interface Props {
    points: TrendPoint[];
    loading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{MONTHS[d.month - 1]} {d.year}</p>
            <p className="text-indigo-600">Total Net: {new Intl.NumberFormat('vi-VN').format(d.totalNet)} ₫</p>
            <p className="text-gray-500">{d.count} employees</p>
        </div>
    );
};

export function PayrollTrendChart({ points, loading }: Props) {
    if (loading) {
        return <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading…</div>;
    }

    const data = points
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        .map(p => ({
            ...p,
            label: `${MONTHS[p.month - 1]} ${p.year}`,
            netM: p.totalNet / 1_000_000,
        }));

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-48 text-sm text-gray-400">No payroll data</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
                <YAxis
                    tickFormatter={v => `${v.toFixed(0)}M`}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                    type="monotone"
                    dataKey="netM"
                    name="Total Net"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
