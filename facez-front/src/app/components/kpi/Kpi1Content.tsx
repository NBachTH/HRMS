"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getEmployees, getMyProfile } from '@/app/services/EmployeeService';
import { getKpi1, upsertKpi1 } from '@/app/services/Kpi1Service';
import { Pagination } from '@/app/components/common/Pagination';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { Employee } from '@/app/commons/types';

const now = new Date();
const RATINGS = ['A', 'B', 'C'];
const RATING_STYLE: Record<string, string> = {
    A: 'bg-green-600 text-white',
    B: 'bg-blue-600 text-white',
    C: 'bg-amber-500 text-white',
};

export function Kpi1Content() {
    const { showToast } = useToast();
    const { role } = useAuth();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [ratings, setRatings] = useState<Record<string, string>>({});
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    // Rating is scoped to the department the user actually manages (enforced server-side by
    // Department.managerId). Only SYSTEM_ADMIN is unrestricted and sees everyone; HR_ADMIN /
    // FINANCE_ADMIN / MANAGER are scoped to their own department.
    const scopedToDept = role !== 'SYSTEM_ADMIN';
    const [deptId, setDeptId] = useState<string | undefined>(undefined);
    const [deptResolved, setDeptResolved] = useState(false);

    useEffect(() => {
        if (scopedToDept) {
            getMyProfile()
                .then(r => setDeptId(r.data?.departmentId || undefined))
                .catch(() => setDeptId(undefined))
                .finally(() => setDeptResolved(true));
        } else {
            setDeptResolved(true);
        }
    }, [scopedToDept]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes, kpiRes] = await Promise.all([
                getEmployees(page, 20, scopedToDept ? deptId : undefined),
                getKpi1(year, month),
            ]);
            setEmployees(empRes.data?.content ?? []);
            setTotalPages(empRes.data?.totalPages ?? 1);
            const map: Record<string, string> = {};
            (Array.isArray(kpiRes.data) ? kpiRes.data : []).forEach(k => { map[k.employeeId] = k.rating; });
            setRatings(map);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được dữ liệu KPI1', 'error');
        } finally {
            setLoading(false);
        }
    }, [year, month, page, scopedToDept, deptId, showToast]);

    useEffect(() => { if (deptResolved) fetchData(); }, [fetchData, deptResolved]);

    const setRating = async (employeeId: string, rating: string) => {
        setBusy(employeeId);
        try {
            await upsertKpi1({ employeeId, year, month, rating });
            setRatings(r => ({ ...r, [employeeId]: rating }));
            showToast('Đã lưu KPI1');
        } catch (err: any) {
            showToast(err?.body?.message || 'Lưu KPI1 thất bại', 'error');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1">HS1 — Đánh giá hiệu quả</h1>
                    <p className="text-sm text-gray-500">Chấm HS1 hằng tháng cho nhân viên (A=1.04 · B=1.00 · C=0.98)</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={month} onChange={e => { setMonth(Number(e.target.value)); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                    </select>
                    <input type="number" value={year} onChange={e => { setYear(Number(e.target.value)); setPage(0); }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Đang tải…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Nhân viên', 'Phòng ban', 'HS1 hiện tại', 'Chấm điểm'].map(h =>
                                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {employees.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Không có nhân viên</td></tr>
                                ) : employees.map(e => (
                                    <tr key={e.employeeId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{e.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{e.departmentName || '—'}</td>
                                        <td className="px-6 py-4">
                                            {ratings[e.employeeId]
                                                ? <span className={`px-2 py-1 text-xs rounded-full font-medium ${RATING_STYLE[ratings[e.employeeId]] || 'bg-gray-100'}`}>{ratings[e.employeeId]}</span>
                                                : <span className="text-xs text-gray-400">Chưa chấm</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                {RATINGS.map(r => (
                                                    <button key={r} disabled={busy === e.employeeId}
                                                        onClick={() => setRating(e.employeeId, r)}
                                                        className={`w-8 h-8 rounded text-xs font-semibold disabled:opacity-50 ${
                                                            ratings[e.employeeId] === r ? RATING_STYLE[r] : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}>{r}</button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}
