"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getAttendances } from '@/app/services/AttendanceService';
import type { Attendance } from '@/app/commons/types';

interface Props {
    employeeId?: string;
    from?: string;
    to?: string;
    refreshKey?: number;
}

function fmt(dt: string | null) {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function round2(n: number) {
    return Number(n ?? 0).toFixed(2);
}

export default function AttendanceTable({ employeeId, from, to, refreshKey }: Props) {
    const [records, setRecords] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAttendances({ page, size: 20, employeeId, from, to });
            if (res.success && res.data) {
                setRecords(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load attendance records');
        } finally {
            setLoading(false);
        }
    }, [page, employeeId, from, to, refreshKey]);

    useEffect(() => { setPage(0); }, [employeeId, from, to, refreshKey]);
    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
    if (error)   return <div className="p-6 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Working h</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid h</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Late h</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Violate</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                                    No attendance records found
                                </td>
                            </tr>
                        ) : records.map((r, i) => (
                            <tr key={r.attendanceId} className="hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm text-gray-500">{i + 1 + page * 20}</td>
                                <td className="px-4 py-4 text-sm text-gray-900 font-medium">{r.date}</td>
                                <td className="px-4 py-4 text-sm text-gray-900">{r.employeeName || r.employeeId}</td>
                                <td className="px-4 py-4 text-sm text-gray-700">{fmt(r.checkIn)}</td>
                                <td className="px-4 py-4 text-sm text-gray-700">{fmt(r.checkOut)}</td>
                                <td className="px-4 py-4 text-sm text-gray-700 text-right">{round2(r.workingHour)}</td>
                                <td className="px-4 py-4 text-sm text-gray-700 text-right">{round2(r.paidHour)}</td>
                                <td className="px-4 py-4 text-sm text-right">
                                    <span className={r.lateHour > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                                        {round2(r.lateHour)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    {r.violate ? (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Yes</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">No</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 text-sm border rounded-md disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </>
    );
}
