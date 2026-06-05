"use client";
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Attendance } from '@/app/commons/types';

interface Props {
    records: Attendance[];
    year: number;
    month: number;
}

function getWeekdaysUpToToday(year: number, month: number): number {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= lastDay; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        if (dow !== 0 && dow !== 6) count++;
    }
    return count;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
const RADIAN = Math.PI / 180;

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    if (value === 0) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
            {value}
        </text>
    );
};

export function AttendanceSummaryDonut({ records, year, month }: Props) {
    const onTime = records.filter(r => !r.violate).length;
    const late = records.filter(r => r.violate).length;
    const standardDays = getWeekdaysUpToToday(year, month);
    const absent = Math.max(0, standardDays - records.length);
    const present = records.length;

    const slices = [
        { name: 'On-time', value: onTime },
        { name: 'Late', value: late },
        { name: 'Absent', value: absent },
    ];

    return (
        <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                    <Pie
                        data={slices}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        dataKey="value"
                        labelLine={false}
                        label={renderLabel}
                    >
                        {slices.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${v} days`, name]} />
                </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 -mt-2">{present} / {standardDays} days present</p>
            <div className="flex gap-3 mt-2">
                {slices.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: COLORS[i] }} />
                        {s.name}
                    </div>
                ))}
            </div>
        </div>
    );
}
