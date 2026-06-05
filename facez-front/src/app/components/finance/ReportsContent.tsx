"use client";

import React, { useState, useCallback } from 'react';
import { BarChart3Icon, DownloadIcon, RefreshCwIcon } from 'lucide-react';
import {
    getLabourCostReport,
    getInsuranceRemittanceReport,
    getPitSummaryReport,
} from '@/app/services/PayrollService';
import { getDepartments } from '@/app/services/DepartmentService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { LabourCostResponse, InsuranceRemittanceResponse, PitSummaryResponse, Department } from '@/app/commons/types';
import { formatVnd, exportToCsv } from '@/app/commons/utils/formatters';

type ReportTab = 'labour' | 'insurance' | 'pit';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Labour Cost Report ─────────────────────────────────────────────────────────

function LabourCostReport({ year, month, deptId }: { year: number; month: number; deptId: string }) {
    const { showToast } = useToast();
    const [data, setData] = useState<LabourCostResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getLabourCostReport(year, month, deptId || undefined);
            if (res.success && res.data) setData(res.data);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load labour cost report', 'error');
        } finally {
            setLoading(false);
        }
    }, [year, month, deptId, showToast]);

    const handleExport = () => {
        if (!data) return;
        exportToCsv(`labour-cost-${year}-${month}.csv`, data.byEmployee.map(e => ({
            'Employee ID': e.employeeId,
            'Employee Name': e.employeeName,
            'Gross Salary': e.totalGross,
            'Net Salary': e.netSalary,
            'Employee Insurance': e.totalEmployeeInsurance,
            'Employer Insurance': e.totalEmployerInsurance,
            'PIT': e.pit,
            'OT Pay': e.otPay,
            'Total Employment Cost': e.totalEmploymentCost,
        })));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <button onClick={fetch} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading…' : 'Load Report'}
                </button>
                {data && (
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                        <DownloadIcon className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

            {data && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Headcount', value: String(data.headcount) },
                            { label: 'Total Gross', value: formatVnd(data.totalGross) },
                            { label: 'Total Net', value: formatVnd(data.totalNetSalary) },
                            { label: 'Total Employment Cost', value: formatVnd(data.totalEmploymentCost) },
                        ].map(s => (
                            <div key={s.label} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium mb-1">{s.label}</p>
                                <p className="text-lg font-bold text-blue-900">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Employee', 'Gross', 'Net', 'Emp. Insurance', 'Empr. Insurance', 'PIT', 'OT', 'Total Cost'].map(h => (
                                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.byEmployee.map(e => (
                                    <tr key={e.employeeId} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-800">{e.employeeName}</td>
                                        <td className="px-4 py-2 text-right">{formatVnd(e.totalGross)}</td>
                                        <td className="px-4 py-2 text-right font-semibold">{formatVnd(e.netSalary)}</td>
                                        <td className="px-4 py-2 text-right text-red-600">{formatVnd(e.totalEmployeeInsurance)}</td>
                                        <td className="px-4 py-2 text-right text-orange-600">{formatVnd(e.totalEmployerInsurance)}</td>
                                        <td className="px-4 py-2 text-right text-red-600">{formatVnd(e.pit)}</td>
                                        <td className="px-4 py-2 text-right">{formatVnd(e.otPay)}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-blue-700">{formatVnd(e.totalEmploymentCost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Insurance Remittance Report ────────────────────────────────────────────────

function InsuranceReport({ year, month }: { year: number; month: number }) {
    const { showToast } = useToast();
    const [data, setData] = useState<InsuranceRemittanceResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getInsuranceRemittanceReport(year, month);
            if (res.success && res.data) setData(res.data);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load insurance report', 'error');
        } finally {
            setLoading(false);
        }
    }, [year, month, showToast]);

    const handleExport = () => {
        if (!data) return;
        exportToCsv(`insurance-${year}-${month}.csv`, data.items.map(e => ({
            'Employee ID': e.employeeId, 'Name': e.employeeName,
            'SI Code': e.socialInsuranceCode || '',
            'Insurance Base': e.insuranceBase,
            'BHXH (Emp)': e.bhxhEmployee, 'BHYT (Emp)': e.bhytEmployee, 'BHTN (Emp)': e.bhtnEmployee,
            'BHXH (Empr)': e.bhxhEmployer, 'BHYT (Empr)': e.bhytEmployer,
            'BHTN (Empr)': e.bhtnEmployer, 'WA Insurance': e.workplaceAccidentInsurance,
            'Total (Emp)': e.totalEmployeeInsurance, 'Total (Empr)': e.totalEmployerInsurance,
        })));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <button onClick={fetch} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading…' : 'Load Report'}
                </button>
                {data && (
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                        <DownloadIcon className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

            {data && (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Headcount', value: String(data.headcount) },
                            { label: 'Total Employee Insurance', value: formatVnd(data.totalEmployeeInsurance) },
                            { label: 'Total Employer Insurance', value: formatVnd(data.totalEmployerInsurance) },
                        ].map(s => (
                            <div key={s.label} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium mb-1">{s.label}</p>
                                <p className="text-lg font-bold text-blue-900">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Employee', 'SI Code', 'Base', 'BHXH↓', 'BHYT↓', 'BHTN↓', 'Total↓', 'BHXH↑', 'BHYT↑', 'BHTN↑', 'WA', 'Total↑'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.items.map(e => (
                                    <tr key={e.employeeId} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{e.employeeName}</td>
                                        <td className="px-3 py-2 text-gray-500">{e.socialInsuranceCode || '—'}</td>
                                        <td className="px-3 py-2 text-right">{formatVnd(e.insuranceBase)}</td>
                                        <td className="px-3 py-2 text-right text-red-600">{formatVnd(e.bhxhEmployee)}</td>
                                        <td className="px-3 py-2 text-right text-red-600">{formatVnd(e.bhytEmployee)}</td>
                                        <td className="px-3 py-2 text-right text-red-600">{formatVnd(e.bhtnEmployee)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-red-700">{formatVnd(e.totalEmployeeInsurance)}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{formatVnd(e.bhxhEmployer)}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{formatVnd(e.bhytEmployer)}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{formatVnd(e.bhtnEmployer)}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">{formatVnd(e.workplaceAccidentInsurance)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-orange-700">{formatVnd(e.totalEmployerInsurance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ── PIT Summary Report ─────────────────────────────────────────────────────────

function PitReport({ year, month }: { year: number; month: number }) {
    const { showToast } = useToast();
    const [data, setData] = useState<PitSummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPitSummaryReport(year, month);
            if (res.success && res.data) setData(res.data);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to load PIT report', 'error');
        } finally {
            setLoading(false);
        }
    }, [year, month, showToast]);

    const handleExport = () => {
        if (!data) return;
        exportToCsv(`pit-summary-${year}-${month}.csv`, data.items.map(e => ({
            'Employee ID': e.employeeId, 'Name': e.employeeName,
            'Tax Code': e.taxCode || '', 'Dependents': e.dependentCount,
            'Taxable Income': e.taxableIncome, 'PIT': e.pit,
        })));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <button onClick={fetch} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading…' : 'Load Report'}
                </button>
                {data && (
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                        <DownloadIcon className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

            {data && (
                <>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 inline-block">
                        <p className="text-xs text-blue-600 font-medium mb-1">Total PIT Remittance</p>
                        <p className="text-xl font-bold text-blue-900">{formatVnd(data.totalPit)}</p>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Employee', 'Tax Code', 'Dependents', 'Taxable Income', 'PIT'].map(h => (
                                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.items.map(e => (
                                    <tr key={e.employeeId} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-800">{e.employeeName}</td>
                                        <td className="px-4 py-2 text-gray-500">{e.taxCode || '—'}</td>
                                        <td className="px-4 py-2 text-center">{e.dependentCount}</td>
                                        <td className="px-4 py-2 text-right">{formatVnd(e.taxableIncome)}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-red-700">{formatVnd(e.pit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Main Reports Content ───────────────────────────────────────────────────────

export function ReportsContent() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [deptId, setDeptId] = useState('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [tab, setTab] = useState<ReportTab>('labour');

    React.useEffect(() => {
        getDepartments().then(res => {
            if (res.success && res.data) {
                const depts = Array.isArray(res.data) ? res.data : ((res.data as any).content ?? []);
                setDepartments(depts);
            }
        }).catch(() => { });
    }, []);

    const currentYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const tabs: { id: ReportTab; label: string }[] = [
        { id: 'labour', label: 'Labour Cost' },
        { id: 'insurance', label: 'Insurance Remittance' },
        { id: 'pit', label: 'PIT Summary' },
    ];

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-3">
                    <BarChart3Icon className="w-8 h-8 text-blue-600" /> Payroll Reports
                </h1>
                <p className="text-sm text-gray-500">Finance / Reports</p>
            </div>

            {/* Period & filter controls */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Month</label>
                    <select value={month} onChange={e => setMonth(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Year</label>
                    <select value={year} onChange={e => setYear(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                {tab === 'labour' && (
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Department (optional)</label>
                        <select value={deptId} onChange={e => setDeptId(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">All departments</option>
                            {departments.map(d => (
                                <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Tab navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Report content */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                {tab === 'labour' && <LabourCostReport year={year} month={month} deptId={deptId} />}
                {tab === 'insurance' && <InsuranceReport year={year} month={month} />}
                {tab === 'pit' && <PitReport year={year} month={month} />}
            </div>
        </div>
    );
}
