"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getMyTimesheets } from '@/app/services/TimesheetService';
import { TimesheetDetailModal } from './TimesheetDetailModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Timesheet } from '@/app/commons/types';

const num = (v?: number) => (v == null ? '0' : (Number.isInteger(v) ? String(v) : v.toFixed(2)));

export function MyTimesheetContent() {
    const { showToast } = useToast();
    const [rows, setRows] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Timesheet | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMyTimesheets();
            setRows(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được bảng công', 'error');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-1">My Timesheets</h1>
                <p className="text-sm text-gray-500">Bảng tổng hợp công theo tháng (sau khi HR chốt công). Bấm để xem chi tiết.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Đang tải…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Kỳ', 'Công chuẩn', 'Thực tế', 'OT (giờ)', 'Nghỉ phép', 'Tổng công hưởng lương', 'Vắng', 'KPI2', ''].map(h =>
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {rows.length === 0 ? (
                                    <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                                        Chưa có bảng công nào (kỳ chưa được chốt).
                                    </td></tr>
                                ) : rows.map(t => (
                                    <tr key={t.id} onClick={() => setSelected(t)}
                                        className="hover:bg-blue-50/50 cursor-pointer">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{String(t.month).padStart(2, '0')}/{t.year}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{t.standardWorkingDays}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{num(t.actualWorkingDays)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{num(t.otHours)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{num(t.annualLeaveDays)}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{num(t.totalPaidDays)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={Number(t.unexplainedAbsenceDays) > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                                                {num(t.unexplainedAbsenceDays)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{num(t.kpi2Index)}</td>
                                        <td className="px-4 py-3 text-sm text-blue-600">Chi tiết →</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TimesheetDetailModal timesheet={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
