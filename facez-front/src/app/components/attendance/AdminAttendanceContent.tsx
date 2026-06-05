"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Edit2Icon, Trash2Icon, CalendarIcon } from 'lucide-react';
import { getAllAttendances, updateAttendance, deleteAttendance } from '@/app/services/AttendanceService';
import { getEmployees } from '@/app/services/EmployeeService';
import { Modal } from '@/app/components/common/Modal';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { Pagination } from '@/app/components/common/Pagination';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { formatDate, formatDateTime } from '@/app/commons/utils/formatters';
import type { Attendance, Employee } from '@/app/commons/types';

// ── Edit Attendance Drawer ────────────────────────────────────────────────────
function EditAttendanceModal({ isOpen, onClose, onSuccess, attendance }: {
    isOpen: boolean; onClose: () => void; onSuccess: () => void; attendance: Attendance | null;
}) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');

    useEffect(() => {
        if (attendance) {
            setCheckIn(attendance.checkIn ? attendance.checkIn.slice(0, 16) : '');
            setCheckOut(attendance.checkOut ? attendance.checkOut.slice(0, 16) : '');
        }
    }, [attendance]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attendance) return;
        setSaving(true);
        try {
            await updateAttendance(attendance.attendanceId, {
                checkIn: checkIn ? new Date(checkIn).toISOString() : attendance.checkIn,
                checkOut: checkOut ? new Date(checkOut).toISOString() : undefined,
            });
            showToast('Attendance record updated');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to update', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Attendance — ${attendance ? formatDate(attendance.date) : ''}`} width="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {attendance && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                        Employee: <strong>{attendance.employeeName || attendance.employeeId}</strong>
                    </p>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                    <input type="datetime-local" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                    <input type="datetime-local" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <p className="text-xs text-gray-400 mt-1">Leave blank if employee hasn't checked out.</p>
                </div>
                <div className="bg-blue-50 rounded-md px-3 py-2 text-xs text-blue-700">
                    Saving will trigger automatic recalculation of working hours, late time, and violations.
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminAttendanceContent() {
    const { role } = useAuth();
    const { showToast } = useToast();
    const canWrite = role === 'HR_ADMIN';

    const [records, setRecords] = useState<Attendance[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [editTarget, setEditTarget] = useState<Attendance | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterFrom, setFilterFrom] = useState(firstOfMonth);
    const [filterTo, setFilterTo] = useState(now.toISOString().slice(0, 10));

    useEffect(() => {
        getEmployees(0, 200).then(r => {
            if (r.success && r.data) setEmployees(r.data.content);
        }).catch(() => {});
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAllAttendances({
                page, size: 20,
                employeeId: filterEmployee || undefined,
                from: filterFrom || undefined,
                to: filterTo || undefined,
            });
            if (res.success && res.data) {
                setRecords(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    }, [page, filterEmployee, filterFrom, filterTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string) => {
        try {
            await deleteAttendance(id);
            showToast('Record deleted');
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <CalendarIcon className="w-7 h-7" /> Attendance Management
                    </h1>
                    <p className="text-sm text-gray-500">
                        {canWrite ? 'View and edit attendance records' : 'Read-only view of attendance records'}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Employee</label>
                    <select value={filterEmployee} onChange={e => { setFilterEmployee(e.target.value); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[160px]">
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
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid h</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Late h</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Violate</th>
                                        {canWrite && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {records.length === 0 ? (
                                        <tr><td colSpan={canWrite ? 8 : 7} className="px-6 py-8 text-center text-gray-400">No records found</td></tr>
                                    ) : records.map(r => (
                                        <tr key={r.attendanceId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.employeeName || r.employeeId}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.date)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{r.checkIn ? formatDateTime(r.checkIn) : '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{r.checkOut ? formatDateTime(r.checkOut) : '—'}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-700">{r.paidHour?.toFixed(1) ?? '—'}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-700">{r.lateHour?.toFixed(1) ?? '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {r.violate
                                                    ? <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Yes</span>
                                                    : <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">No</span>}
                                            </td>
                                            {canWrite && (
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setEditTarget(r)}
                                                            className="p-1 text-gray-500 hover:text-blue-600" title="Edit">
                                                            <Edit2Icon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm(r.attendanceId)}
                                                            className="p-1 text-gray-500 hover:text-red-600" title="Delete">
                                                            <Trash2Icon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
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

            <EditAttendanceModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={fetchData}
                attendance={editTarget}
            />

            <ConfirmDialog
                open={!!deleteConfirm}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this attendance record? This action cannot be undone."
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                onCancel={() => setDeleteConfirm(null)}
                danger
            />
        </div>
    );
}
