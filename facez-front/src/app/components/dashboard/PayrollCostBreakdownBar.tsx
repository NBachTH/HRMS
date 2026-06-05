"use client";
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { Payroll } from '@/app/commons/types';

function fmtM(v: number) {
    return `${(v / 1_000_000).toFixed(1)}M ₫`;
}

interface Props {
    payrolls: Payroll[];
}

export function PayrollCostBreakdownBar({ payrolls }: Props) {
    if (payrolls.length === 0) {
        return <div className="flex items-center justify-center h-40 text-sm text-gray-400">No payroll data</div>;
    }

    const totalNet = payrolls.reduce((s, p) => s + (p.netSalary ?? 0), 0);
    const totalPit = payrolls.reduce((s, p) => s + (p.pit ?? 0), 0);
    const totalBhxh = payrolls.reduce((s, p) => s + (p.bhxhEmployee ?? 0), 0);
    const totalBhyt = payrolls.reduce((s, p) => s + (p.bhytEmployee ?? 0), 0);
    const totalBhtn = payrolls.reduce((s, p) => s + (p.bhtnEmployee ?? 0), 0);

    const data = [{
        name: 'This month',
        'Net Salary': totalNet / 1_000_000,
        'PIT': totalPit / 1_000_000,
        'BHXH': totalBhxh / 1_000_000,
        'BHYT': totalBhyt / 1_000_000,
        'BHTN': totalBhtn / 1_000_000,
    }];

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs space-y-1">
                {payload.map((p: any) => (
                    <div key={p.dataKey} className="flex justify-between gap-4">
                        <span style={{ color: p.fill }}>{p.dataKey}</span>
                        <span className="font-medium">{fmtM(p.value * 1_000_000)}</span>
                    </div>
                ))}
                <div className="border-t border-gray-100 pt-1 flex justify-between gap-4 font-semibold">
                    <span>Total Gross</span>
                    <span>{fmtM((totalNet + totalPit + totalBhxh + totalBhyt + totalBhtn))}</span>
                </div>
            </div>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tickFormatter={v => `${v}M`} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Bar dataKey="Net Salary" stackId="a" fill="#10b981" />
                <Bar dataKey="PIT" stackId="a" fill="#ef4444" />
                <Bar dataKey="BHXH" stackId="a" fill="#f59e0b" />
                <Bar dataKey="BHYT" stackId="a" fill="#f97316" />
                <Bar dataKey="BHTN" stackId="a" fill="#eab308" radius={[0, 3, 3, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}
