"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getMyPayrolls } from '@/app/services/PayrollService';
import type { Payroll } from '@/app/commons/types';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_STYLES: Record<string, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
};

function fmt(value: number | null | undefined) {
    if (value == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function Row({ label, value, bold, red }: { label: string; value: string; bold?: boolean; red?: boolean }) {
    return (
        <div className={`flex justify-between py-1.5 text-sm ${bold ? 'font-semibold' : ''}`}>
            <span className="text-gray-500">{label}</span>
            <span className={red ? 'text-red-600' : 'text-gray-800'}>{value}</span>
        </div>
    );
}

function Divider() {
    return <div className="border-t border-gray-100 my-1" />;
}

function PayslipDetail({ payroll, onClose }: { payroll: Payroll; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">
                            {payroll.employeeName} — {MONTHS[payroll.payrollMonth - 1]} {payroll.payrollYear}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Pay Slip Detail</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[payroll.status] || 'bg-gray-100 text-gray-600'}`}>
                        {payroll.status}
                    </span>
                </div>

                <div className="px-6 py-4 space-y-1">
                    {/* Attendance */}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1 mb-1">Attendance</p>
                    <Row label="Actual working days (NCtt)" value={String(payroll.actualWorkingDays ?? '—')} />
                    <Row label="Standard working days (Nt)" value={String(payroll.standardWorkingDays ?? '—')} />

                    <Divider />

                    {/* Earnings */}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2 mb-1">Earnings</p>
                    <Row label="Performance salary (Lhq)" value={fmt(payroll.performanceSalary)} />
                    <Row label="Position coefficient (Li)" value={fmt(payroll.positionCoefficient)} />
                    <Row label="Living allowance (HT2)" value={fmt(payroll.livingAllowance)} />
                    <Row label="Language allowance (HT1)" value={fmt(payroll.languageAllowance)} />
                    <Row label="ODC allowance (HT3)" value={fmt(payroll.odcAllowance)} />
                    <Row label="KPI1 score" value={payroll.kpi1Score?.toFixed(2) ?? '—'} />
                    <Row label="KPI2 score" value={payroll.kpi2Score?.toFixed(2) ?? '—'} />
                    <Row label="KPI average (KPItb)" value={payroll.kpiAverage?.toFixed(2) ?? '—'} />
                    <Row label="OT pay" value={fmt(payroll.otPay)} />
                    <Row label="Bonus" value={fmt(payroll.bonus)} />

                    <Divider />
                    <Row label="Base gross" value={fmt(payroll.baseGross)} />
                    <Row label="Total gross" value={fmt(payroll.totalGross)} bold />

                    <Divider />

                    {/* Deductions */}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2 mb-1">Deductions</p>
                    <Row label="Insurance base (LCB)" value={fmt(payroll.insuranceBase)} />
                    <Row label="Social insurance — BHXH 8%" value={fmt(payroll.bhxhEmployee)} red />
                    <Row label="Health insurance — BHYT 1.5%" value={fmt(payroll.bhytEmployee)} red />
                    <Row label="Unemployment ins. — BHTN 1%" value={fmt(payroll.bhtnEmployee)} red />
                    <Row label="Dependents" value={String(payroll.dependentCount ?? 0)} />
                    <Row label="Taxable income" value={fmt(payroll.taxableIncome)} />
                    <Row label="Personal income tax (PIT)" value={fmt(payroll.pit)} red />

                    <Divider />

                    {/* Net */}
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-bold text-gray-700">Net Salary</span>
                        <span className="text-xl font-bold text-blue-700">{fmt(payroll.netSalary)}</span>
                    </div>

                    {payroll.notes && (
                        <>
                            <Divider />
                            <p className="text-xs text-gray-500">Note: {payroll.notes}</p>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export function PayslipContent() {
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Payroll | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const now = new Date();
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const fetchPayslips = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getMyPayrolls(page, 20);
            if (res.success && res.data) {
                // Filter by year client-side (API doesn't support year filter on /my)
                const all = res.data.content.filter(p => p.payrollYear === filterYear);
                setPayrolls(all);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load payslips');
        } finally {
            setLoading(false);
        }
    }, [filterYear, page]);

    useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2">My Payslips</h1>
                <p className="text-sm text-gray-500">Personal / Payslips</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-end gap-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Year</label>
                    <select value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setPage(0); }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <p className="text-sm text-gray-500 pb-2">Showing payslips for {filterYear}</p>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-12">Loading...</div>
            ) : error ? (
                <div className="text-center text-red-500 py-12">{error}</div>
            ) : payrolls.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-gray-400 text-lg mb-2">No payslips found</p>
                    <p className="text-gray-400 text-sm">Payslips will appear here once HR processes payroll.</p>
                </div>
            ) : (
                <>
                    {/* List view — salary figures are hidden here; open an item to see details. */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Kỳ lương', 'Ngày công', 'KPI', 'Trạng thái', ''].map(h =>
                                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {payrolls.map(p => (
                                    <tr key={p.payrollId} onClick={() => setSelected(p)}
                                        className="hover:bg-blue-50/50 cursor-pointer">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {MONTHS[p.payrollMonth - 1]} {p.payrollYear}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {p.actualWorkingDays ?? '—'}/{p.standardWorkingDays ?? '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{p.kpiAverage?.toFixed(2) ?? '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-blue-600">Chi tiết →</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="mt-6 flex justify-center gap-2 text-sm">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Previous</button>
                            <span className="px-3 py-1 text-gray-600">Page {page + 1} of {totalPages}</span>
                            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
                        </div>
                    )}
                </>
            )}

            {selected && <PayslipDetail payroll={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
