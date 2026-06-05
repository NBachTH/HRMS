"use client";
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { Attendance } from '@/app/commons/types';

interface Props {
    records: Attendance[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs">
            <p className="font-semibold text-gray-800 mb-1">{d.date}</p>
            <p className="text-gray-600">{d.hours.toFixed(1)}h worked</p>
            <p className="text-gray-500">{d.checkIn} → {d.checkOut}</p>
            {d.late && <p className="text-amber-600 font-medium mt-0.5">Late</p>}
        </div>
    );
};

export function WorkingHoursBarChart({ records }: Props) {
    const data = [...records]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(r => ({
            day: Number(r.date.split('-')[2]),
            date: r.date,
            hours: r.workingHour ?? 0,
            late: r.violate,
            checkIn: r.checkIn
                ? new Date(r.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : '—',
            checkOut: r.checkOut
                ? new Date(r.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : '—',
        }));

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
                No attendance data for this period
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={8} stroke="#d1d5db" strokeDasharray="4 2" label={{ value: '8h', position: 'right', fontSize: 10, fill: '#9ca3af' }} />
                <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={20}>
                    {data.map((entry, i) => (
                        <Cell key={i} fill={entry.late ? '#f59e0b' : '#6366f1'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
