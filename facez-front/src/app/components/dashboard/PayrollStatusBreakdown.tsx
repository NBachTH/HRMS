"use client";
import React from 'react';
import type { Payroll } from '@/app/commons/types';

interface Props {
    payrolls: Payroll[];
}

export function PayrollStatusBreakdown({ payrolls }: Props) {
    const total = payrolls.length;
    const draft = payrolls.filter(p => p.status === 'DRAFT').length;
    const approved = payrolls.filter(p => p.status === 'APPROVED').length;
    const paid = payrolls.filter(p => p.status === 'PAID').length;

    const segments = [
        { label: 'DRAFT', count: draft, color: 'bg-amber-400' },
        { label: 'APPROVED', count: approved, color: 'bg-blue-500' },
        { label: 'PAID', count: paid, color: 'bg-green-500' },
    ];

    if (total === 0) {
        return <p className="text-sm text-gray-400 text-center py-4">No payroll data for this period</p>;
    }

    return (
        <div>
            {/* Stacked bar */}
            <div className="flex h-4 rounded-full overflow-hidden mb-3 bg-gray-100">
                {segments.map(s => (
                    s.count > 0 && (
                        <div
                            key={s.label}
                            className={`${s.color} transition-all duration-300`}
                            style={{ width: `${(s.count / total) * 100}%` }}
                            title={`${s.label}: ${s.count}`}
                        />
                    )
                ))}
            </div>
            {/* Legend with counts */}
            <div className="flex justify-between text-xs text-gray-600">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                        <span>{s.label}</span>
                        <span className="font-semibold text-gray-800">{s.count}</span>
                    </div>
                ))}
                <div className="text-gray-400">Total: {total}</div>
            </div>
        </div>
    );
}
