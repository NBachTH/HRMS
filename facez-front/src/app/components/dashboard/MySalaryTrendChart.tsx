"use client";
import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Payroll } from '@/app/commons/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
    payrolls: Payroll[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{d.label}</p>
            <p className="text-green-700">Net: {new Intl.NumberFormat('vi-VN').format(d.net)} ₫</p>
        </div>
    );
};

export function MySalaryTrendChart({ payrolls }: Props) {
    // payrolls come newest-first; reverse for chronological display
    const data = [...payrolls]
        .sort((a, b) => a.payrollYear !== b.payrollYear
            ? a.payrollYear - b.payrollYear
            : a.payrollMonth - b.payrollMonth)
        .map(p => ({
            label: `${MONTHS[p.payrollMonth - 1]} ${p.payrollYear}`,
            net: p.netSalary ?? 0,
            netM: (p.netSalary ?? 0) / 1_000_000,
        }));

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                No payroll history yet
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
                <YAxis
                    tickFormatter={v => `${v.toFixed(0)}M`}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="netM"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#salaryGrad)"
                    dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
