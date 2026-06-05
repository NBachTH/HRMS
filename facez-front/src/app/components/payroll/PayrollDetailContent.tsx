"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ClipboardListIcon } from 'lucide-react';
import { getPayrollById } from '@/app/services/PayrollService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Payroll } from '@/app/commons/types';
import { formatVnd } from '@/app/commons/utils/formatters';

const STATUS_STYLES: Record<string, string> = {
    DRAFT:            'bg-yellow-100 text-yellow-800',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
    APPROVED:         'bg-blue-100 text-blue-800',
    REJECTED:         'bg-red-100 text-red-800',
    PAID:             'bg-green-100 text-green-800',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
    return (
        <div className={`flex justify-between py-2 border-b border-gray-100 last:border-0 ${highlight ? 'font-semibold' : ''}`}>
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm ${highlight ? 'text-gray-900' : 'text-gray-700'}`}>{value}</span>
        </div>
    );
}

interface PayrollDetailContentProps {
    payrollId: string;
}

export function PayrollDetailContent({ payrollId }: PayrollDetailContentProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [payroll, setPayroll] = useState<Payroll | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPayrollById(payrollId)
            .then(res => { if (res.success && res.data) setPayroll(res.data); })
            .catch(err => showToast(err?.body?.message || 'Failed to load payroll', 'error'))
            .finally(() => setLoading(false));
    }, [payrollId, showToast]);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!payroll) {
        return <div className="p-8 text-center text-gray-500">Payroll record not found.</div>;
    }

    const period = `${MONTHS[payroll.payrollMonth - 1]} ${payroll.payrollYear}`;

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeftIcon className="w-4 h-4" /> Back
            </button>

            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1 flex items-center gap-2">
                        <ClipboardListIcon className="w-7 h-7" /> Payroll Detail
                    </h1>
                    <p className="text-sm text-gray-500">{payroll.employeeName} · {period}</p>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${STATUS_STYLES[payroll.status] || 'bg-gray-100 text-gray-600'}`}>
                    {payroll.status}
                </span>
            </div>

            {payroll.rejectionReason && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                    <strong>Rejection reason:</strong> {payroll.rejectionReason}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Earnings</h3>
                    <Row label="Performance Salary" value={formatVnd(payroll.performanceSalary)} />
                    <Row label="Position Coefficient" value={payroll.positionCoefficient?.toFixed(2)} />
                    <Row label="Living Allowance" value={formatVnd(payroll.livingAllowance)} />
                    <Row label="Language Allowance" value={formatVnd(payroll.languageAllowance)} />
                    <Row label="ODC Allowance" value={formatVnd(payroll.odcAllowance)} />
                    <Row label="OT Pay" value={formatVnd(payroll.otPay)} />
                    <Row label="Bonus" value={formatVnd(payroll.bonus)} />
                    <Row label="Base Gross" value={formatVnd(payroll.baseGross)} />
                    <Row label="Total Gross" value={formatVnd(payroll.totalGross)} highlight />
                </div>

                {/* KPI & Attendance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">KPI & Attendance</h3>
                    <Row label="KPI 1 Score" value={payroll.kpi1Score?.toFixed(2)} />
                    <Row label="KPI 2 Score" value={payroll.kpi2Score?.toFixed(2)} />
                    <Row label="KPI Average" value={payroll.kpiAverage?.toFixed(2)} />
                    <Row label="Actual Working Days" value={payroll.actualWorkingDays} />
                    <Row label="Standard Working Days" value={payroll.standardWorkingDays} />
                </div>

                {/* Deductions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Deductions</h3>
                    <Row label="Insurance Base" value={formatVnd(payroll.insuranceBase)} />
                    <Row label="BHXH (Employee)" value={formatVnd(payroll.bhxhEmployee)} />
                    <Row label="BHYT (Employee)" value={formatVnd(payroll.bhytEmployee)} />
                    <Row label="BHTN (Employee)" value={formatVnd(payroll.bhtnEmployee)} />
                    <Row label="Dependent Count" value={payroll.dependentCount} />
                    <Row label="Taxable Income" value={formatVnd(payroll.taxableIncome)} />
                    <Row label="PIT" value={formatVnd(payroll.pit)} />
                </div>

                {/* Employer Contributions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Employer Contributions</h3>
                    <Row label="BHXH (Employer)" value={formatVnd(payroll.bhxhEmployer)} />
                    <Row label="BHYT (Employer)" value={formatVnd(payroll.bhytEmployer)} />
                    <Row label="BHTN (Employer)" value={formatVnd(payroll.bhtnEmployer)} />
                    <Row label="Workplace Accident Ins." value={formatVnd(payroll.workplaceAccidentInsurance)} />
                    <Row label="Total Employer Contrib." value={formatVnd(payroll.totalEmployerContributions)} />
                    <Row label="Total Employment Cost" value={formatVnd(payroll.totalEmploymentCost)} highlight />
                </div>
            </div>

            {/* Net salary summary */}
            <div className="mt-6 bg-blue-900 text-white rounded-xl p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm text-blue-200 mb-1">Net Salary</p>
                    <p className="text-3xl font-bold">{formatVnd(payroll.netSalary)}</p>
                </div>
                <div className="text-right text-sm text-blue-200">
                    <p>{payroll.employeeName}</p>
                    <p>{period}</p>
                    {payroll.notes && <p className="mt-1 italic">{payroll.notes}</p>}
                </div>
            </div>
        </div>
    );
}
