"use client";
import React from 'react';
import type { Attendance } from '@/app/commons/types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
    records: Attendance[];
    loading: boolean;
    year: number;
    month: number;
    onPeriodChange: (year: number, month: number) => void;
}

function fmtTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function AttendanceMonthTable({ records, loading, year, month, onPeriodChange }: Props) {
    const now = new Date();
    const currentYear = now.getFullYear();

    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    const prev = () => {
        if (month === 1) onPeriodChange(year - 1, 12);
        else onPeriodChange(year, month - 1);
    };
    const next = () => {
        const isCurrentMonth = year === currentYear && month === now.getMonth() + 1;
        if (isCurrentMonth) return;
        if (month === 12) onPeriodChange(year + 1, 1);
        else onPeriodChange(year, month + 1);
    };
    const isCurrentMonth = year === currentYear && month === now.getMonth() + 1;

    return (
        <div>
            {/* Period picker */}
            <div className="flex items-center gap-2 mb-3">
                <button onClick={prev} className="p-1 rounded hover:bg-gray-100 text-gray-500 text-sm">‹</button>
                <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                    {MONTHS[month - 1]} {year}
                </span>
                <button onClick={next} disabled={isCurrentMonth}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 text-sm disabled:opacity-30">›</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                            <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                            <th className="py-2 pr-4 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                            <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={5} className="py-6 text-center text-gray-400">Loading…</td></tr>
                        ) : sorted.length === 0 ? (
                            <tr><td colSpan={5} className="py-6 text-center text-gray-400">No records for this period</td></tr>
                        ) : sorted.map(r => (
                            <tr key={r.attendanceId} className="hover:bg-gray-50">
                                <td className="py-2 pr-4 text-gray-700">{r.date}</td>
                                <td className="py-2 pr-4 text-gray-600">{fmtTime(r.checkIn)}</td>
                                <td className="py-2 pr-4 text-gray-600">{fmtTime(r.checkOut)}</td>
                                <td className="py-2 pr-4 text-right text-gray-700">{(r.workingHour ?? 0).toFixed(1)}h</td>
                                <td className="py-2">
                                    {r.violate
                                        ? <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Late</span>
                                        : <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">On-time</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
