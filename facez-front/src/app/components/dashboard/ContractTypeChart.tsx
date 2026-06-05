"use client";
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Contract } from '@/app/commons/types';

const SLICES = [
    { key: 'INDEFINITE', label: 'Indefinite', color: '#6366f1' },
    { key: 'FIXED_TERM', label: 'Fixed-term', color: '#10b981' },
    { key: 'PROBATION', label: 'Probation', color: '#f59e0b' },
];

interface Props {
    contracts: Contract[];
}

export function ContractTypeChart({ contracts }: Props) {
    const active = contracts.filter(c => c.status === 'ACTIVE' || !c.status);
    const data = SLICES
        .map(s => ({ ...s, value: active.filter(c => c.contractType === s.key).length }))
        .filter(s => s.value > 0);

    const total = data.reduce((s, d) => s + d.value, 0);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-36 text-sm text-gray-400">No active contracts</div>;
    }

    return (
        <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                        dataKey="value" labelLine={false}>
                        {data.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${v}`, name]} />
                </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 -mt-1 mb-1">{total} active contracts</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                {data.map(s => (
                    <div key={s.key} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        {s.label} ({s.value})
                    </div>
                ))}
            </div>
        </div>
    );
}
