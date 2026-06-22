"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getTimesheets } from '@/app/services/TimesheetService';
import { TimesheetDetailModal } from './TimesheetDetailModal';
import { WorkDayConflictsModal } from './WorkDayConflictsModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { exportToCsv } from '@/app/commons/utils/formatters';
import type { Timesheet } from '@/app/commons/types';

const now = new Date();

const num = (v?: number) => (v == null ? '0' : (Number.isInteger(v) ? String(v) : v.toFixed(2)));

export function TimesheetContent() {
    const { showToast } = useToast();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [rows, setRows] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Timesheet | null>(null);
    const [showConflicts, setShowConflicts] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTimesheets(year, month);
            setRows(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load timesheets', 'error');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [year, month, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const exportCsv = () => {
        if (rows.length === 0) return;
        exportToCsv(`timesheet_${year}_${month}.csv`, rows.map(t => ({
            Employee: t.employeeName,
            ID: t.employeeId,
            Standard: t.standardWorkingDays,
            Actual: num(t.actualWorkingDays),
            OT_Hours: num(t.otHours),
            Annual: num(t.annualLeaveDays),
            Comp: num(t.compLeaveDays),
            Unpaid: num(t.unpaidLeaveDays),
            Holiday: num(t.holidayLeaveDays),
            TotalPaid: num(t.totalPaidDays),
            Absent: num(t.unexplainedAbsenceDays),
            LateEarlyHours: num(t.lateEarlyTotalHours),
            HS2: num(t.kpi2Index),
        })));
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1">Timesheets</h1>
                    <p className="text-sm text-gray-500">Monthly aggregated work days (generated on period close)</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={month} onChange={e => setMonth(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                            <option key={m} value={m}>Tháng {m}</option>)}
                    </select>
                    <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    <button onClick={() => setShowConflicts(true)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-amber-300 text-amber-700 rounded-md hover:bg-amber-50">
                        <AlertTriangle className="w-4 h-4" /> Conflicts
                    </button>
                    <button onClick={exportCsv}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Standard</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT (h)</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Annual</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unpaid</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Paid</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Absent</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HS2</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rows.length === 0 ? (
                                    <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400">
                                        No timesheets for {month}/{year}. Close the attendance period first.
                                    </td></tr>
                                ) : rows.map((t, i) => (
                                    <tr key={t.id} onClick={() => setSelected(t)}
                                        className="hover:bg-blue-50/50 cursor-pointer">
                                        <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.employeeName || t.employeeId}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">{t.standardWorkingDays}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">{num(t.actualWorkingDays)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">{num(t.otHours)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">{num(t.annualLeaveDays)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">{num(t.unpaidLeaveDays)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{num(t.totalPaidDays)}</td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <span className={Number(t.unexplainedAbsenceDays) > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                                                {num(t.unexplainedAbsenceDays)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">{num(t.kpi2Index)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TimesheetDetailModal timesheet={selected} onClose={() => setSelected(null)} />
            <WorkDayConflictsModal
                isOpen={showConflicts} year={year} month={month}
                onClose={() => setShowConflicts(false)} onResolved={fetchData}
            />
        </div>
    );
}
