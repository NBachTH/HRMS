"use client";

import React, { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { Modal } from '@/app/components/common/Modal';
import { getMyCheckinLogsByDate } from '@/app/services/CheckinLogService';
import type { Attendance, CheckinLog } from '@/app/commons/types';

interface Props {
    attendance: Attendance | null;
    onClose: () => void;
}

function fmtTime(dt: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function CheckinLogDayModal({ attendance, onClose }: Props) {
    const [logs, setLogs] = useState<CheckinLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!attendance) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        getMyCheckinLogsByDate(attendance.date)
            .then(res => {
                if (cancelled) return;
                const items = (Array.isArray(res.data) ? res.data : ((res.data as any)?.content ?? [])) as CheckinLog[];
                // Server already scopes to the current user — just order oldest → newest.
                items.sort((a, b) => new Date(a.logTime).getTime() - new Date(b.logTime).getTime());
                setLogs(items);
            })
            .catch((err: any) => { if (!cancelled) setError(err?.body?.message || 'Failed to load check-in logs'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [attendance]);

    if (!attendance) return null;

    return (
        <Modal isOpen={!!attendance} onClose={onClose}
            title={`Check-in logs · ${attendance.date}`} width="max-w-2xl">
            <div className="space-y-4">
                {/* Summary from the attendance record */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                        <div className="text-xs text-gray-500">Employee</div>
                        <div className="font-medium text-gray-800">{attendance.employeeName || attendance.employeeId}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Check-in</div>
                        <div className="text-gray-800">{attendance.checkIn ? fmtTime(attendance.checkIn) : '—'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Check-out</div>
                        <div className="text-gray-800">{attendance.checkOut ? fmtTime(attendance.checkOut) : '—'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Working / Paid h</div>
                        <div className="text-gray-800">{Number(attendance.workingHour ?? 0).toFixed(2)} / {Number(attendance.paidHour ?? 0).toFixed(2)}</div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Raw device events {logs.length > 0 && <span className="text-gray-400 font-normal">({logs.length})</span>}
                    </h3>

                    {loading ? (
                        <div className="py-8 text-center text-gray-500">Loading…</div>
                    ) : error ? (
                        <div className="py-8 text-center text-red-500">{error}</div>
                    ) : logs.length === 0 ? (
                        <div className="py-8 text-center text-gray-400">No raw check-in logs for this day.</div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-md">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-2 text-left">#</th>
                                        <th className="px-3 py-2 text-left">Time</th>
                                        <th className="px-3 py-2 text-left">Type</th>
                                        <th className="px-3 py-2 text-left">Device</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map((log, i) => (
                                        <tr key={log.logId}>
                                            <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                                            <td className="px-3 py-2 font-medium text-gray-800">{fmtTime(log.logTime)}</td>
                                            <td className="px-3 py-2">
                                                {log.logType === 'IN' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        <LogIn className="w-3.5 h-3.5" /> IN
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                        <LogOut className="w-3.5 h-3.5" /> OUT
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">{log.deviceName || log.deviceId || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
