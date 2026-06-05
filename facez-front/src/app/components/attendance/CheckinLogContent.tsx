"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollTextIcon } from 'lucide-react';
import { getCheckinLogs } from '@/app/services/CheckinLogService';
import { getEmployees } from '@/app/services/EmployeeService';
import { Pagination } from '@/app/components/common/Pagination';
import { formatDateTime } from '@/app/commons/utils/formatters';
import type { CheckinLog, Employee } from '@/app/commons/types';

export function CheckinLogContent() {
    const [logs, setLogs] = useState<CheckinLog[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterFrom, setFilterFrom] = useState(weekAgo);
    const [filterTo, setFilterTo] = useState(today);
    const [filterType, setFilterType] = useState<'IN' | 'OUT' | ''>('');

    useEffect(() => {
        getEmployees(0, 200).then(r => {
            if (r.success && r.data) setEmployees(r.data.content);
        }).catch(() => {});
    }, []);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getCheckinLogs({
                page,
                size: 50,
                employeeId: filterEmployee || undefined,
                from: filterFrom || undefined,
                to: filterTo || undefined,
                logType: filterType || undefined,
            });
            if (res.success && res.data) {
                setLogs(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load checkin logs');
        } finally {
            setLoading(false);
        }
    }, [page, filterEmployee, filterFrom, filterTo, filterType]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <ScrollTextIcon className="w-7 h-7" /> Checkin Log
                </h1>
                <p className="text-sm text-gray-500">Raw device check-in/out events — read only</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Employee</label>
                    <select
                        value={filterEmployee}
                        onChange={e => { setFilterEmployee(e.target.value); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[160px]"
                    >
                        <option value="">All employees</option>
                        {employees.map(e => (
                            <option key={e.employeeId} value={e.employeeId}>{e.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select
                        value={filterType}
                        onChange={e => { setFilterType(e.target.value as any); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All</option>
                        <option value="IN">IN</option>
                        <option value="OUT">OUT</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading…</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Log Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No records found</td></tr>
                                    ) : logs.map((log, i) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-sm text-gray-500">{page * 50 + i + 1}</td>
                                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{log.employeeName || log.employeeId}</td>
                                            <td className="px-6 py-3 text-sm text-gray-500">{log.deviceName || log.deviceId}</td>
                                            <td className="px-6 py-3 text-sm text-gray-500">{formatDateTime(log.logTime)}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${log.logType === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {log.logType}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
