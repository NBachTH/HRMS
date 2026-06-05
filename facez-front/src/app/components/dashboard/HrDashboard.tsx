"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { UsersIcon, BanknoteIcon, CheckCircleIcon, FileTextIcon } from 'lucide-react';
import { getEmployees } from '@/app/services/EmployeeService';
import { getPayrollsByPeriod } from '@/app/services/PayrollService';
import { getContracts } from '@/app/services/ContractService';
import { getDepartments } from '@/app/services/DepartmentService';
import { getAllLeaves, approveLeave, rejectLeave } from '@/app/services/LeaveService';
import { getAllOTRequests, approveOTRequest, rejectOTRequest } from '@/app/services/OTRequestService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { PayrollTrendChart } from './PayrollTrendChart';
import { PayrollCostBreakdownBar } from './PayrollCostBreakdownBar';
import { PayrollStatusBreakdown } from './PayrollStatusBreakdown';
import { DeptHeadcountChart } from './DeptHeadcountChart';
import { ContractTypeChart } from './ContractTypeChart';
import { LeaveApprovalRateChart } from './LeaveApprovalRateChart';
import { ApprovalMiniTable } from './ApprovalMiniTable';
import type { Payroll, Contract, LeaveRequest, OTRequest, Department } from '@/app/commons/types';
import type { TrendPoint } from './PayrollTrendChart';
import type { DeptCount } from './DeptHeadcountChart';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface StatCardProps { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; }
function StatCard({ label, value, sub, icon, color }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-5 flex items-start gap-4">
            <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function getPrev6Months(fromYear: number, fromMonth: number): { year: number; month: number }[] {
    const result = [];
    for (let i = 5; i >= 0; i--) {
        let m = fromMonth - i;
        let y = fromYear;
        while (m <= 0) { m += 12; y--; }
        result.push({ year: y, month: m });
    }
    return result;
}

export function HrDashboard() {
    const { showToast } = useToast();
    const now = new Date();
    const [filterYear, setFilterYear] = useState(now.getFullYear());
    const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

    const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
    const [deptCounts, setDeptCounts] = useState<DeptCount[]>([]);
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [pendingOT, setPendingOT] = useState<OTRequest[]>([]);
    const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);

    const [loading, setLoading] = useState(true);
    const [payrollLoading, setPayrollLoading] = useState(false);
    const [trendLoading, setTrendLoading] = useState(true);
    const [approvalLoading, setApprovalLoading] = useState(true);

    // Load static data once on mount
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [empRes, ctrRes] = await Promise.all([
                    getEmployees(0, 1),
                    getContracts(),
                ]);
                if (empRes.success) setTotalEmployees(empRes.data?.totalElements ?? 0);
                if (ctrRes.success) setContracts(Array.isArray(ctrRes.data) ? ctrRes.data : ((ctrRes.data as any)?.content ?? []));
            } catch { /* silent */ } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Load department headcount once on mount
    useEffect(() => {
        const load = async () => {
            try {
                const deptRes = await getDepartments();
                const depts = deptRes.success ? (deptRes.data as Department[]) : [];
                const counts = await Promise.all(
                    depts.map(async d => {
                        try {
                            const r = await getEmployees(0, 1, d.departmentId);
                            return { deptName: d.departmentName, count: r.data?.totalElements ?? 0 };
                        } catch { return { deptName: d.departmentName, count: 0 }; }
                    })
                );
                setDeptCounts(counts);
            } catch { /* silent */ }
        };
        load();
    }, []);

    // Load payroll trend (6 months) once on mount
    useEffect(() => {
        const load = async () => {
            setTrendLoading(true);
            try {
                const periods = getPrev6Months(filterYear, filterMonth);
                const results = await Promise.all(
                    periods.map(({ year, month }) => getPayrollsByPeriod(year, month, 0, 200).catch(() => null))
                );
                const points: TrendPoint[] = results.map((res, i) => {
                    const { year, month } = periods[i];
                    const content: Payroll[] = res?.success ? (res.data?.content ?? []) : [];
                    return {
                        year, month,
                        totalNet: content.reduce((s, p) => s + (p.netSalary ?? 0), 0),
                        count: content.length,
                    };
                });
                setTrendPoints(points);
            } catch { /* silent */ } finally {
                setTrendLoading(false);
            }
        };
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load period-specific payroll (re-runs when month/year picker changes)
    const fetchPayrollPeriod = useCallback(async (year: number, month: number) => {
        setPayrollLoading(true);
        try {
            const res = await getPayrollsByPeriod(year, month, 0, 200);
            if (res.success) {
                const content = res.data?.content ?? [];
                if ((res.data?.totalElements ?? 0) > 200) {
                    console.warn('Dashboard: payroll size > 200 — data may be incomplete');
                }
                setPayrolls(content);
            }
        } catch { /* silent */ } finally {
            setPayrollLoading(false);
        }
    }, []);

    useEffect(() => { fetchPayrollPeriod(filterYear, filterMonth); }, [filterYear, filterMonth, fetchPayrollPeriod]);

    // Load approvals
    const fetchApprovals = useCallback(async () => {
        setApprovalLoading(true);
        try {
            const [lRes, otRes, allLRes] = await Promise.all([
                getAllLeaves('MANAGER_APPROVED', 0, 10),
                getAllOTRequests('MANAGER_APPROVED', 0, 10),
                getAllLeaves(null, 0, 200),
            ]);
            if (lRes.success) setPendingLeaves(lRes.data?.content ?? []);
            if (otRes.success) setPendingOT(otRes.data?.content ?? []);
            if (allLRes.success) setAllLeaves(allLRes.data?.content ?? []);
        } catch { /* silent */ } finally {
            setApprovalLoading(false);
        }
    }, []);

    useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

    // Computed stat values
    const expiringContracts = (() => {
        const today = new Date();
        const limit = new Date(today); limit.setDate(today.getDate() + 30);
        return contracts.filter(c => {
            if (!c.endDate) return false;
            const d = new Date(c.endDate);
            return d >= today && d <= limit;
        }).length;
    })();

    const approvedCount = payrolls.filter(p => p.status === 'APPROVED').length;

    const handleApproveLeave = async (id: string) => {
        try { await approveLeave(id); showToast('Leave approved'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed', 'error'); }
    };
    const handleRejectLeave = async (id: string) => {
        try { await rejectLeave(id); showToast('Leave rejected'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed', 'error'); }
    };
    const handleApproveOT = async (id: string) => {
        try { await approveOTRequest(id); showToast('OT approved'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed', 'error'); }
    };
    const handleRejectOT = async (id: string) => {
        try { await rejectOTRequest(id); showToast('OT rejected'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed', 'error'); }
    };

    const currentYear = now.getFullYear();
    const years = Array.from({ length: 4 }, (_, i) => currentYear - 2 + i);

    return (
        <div className="p-8 space-y-6">
            {/* Header + period picker */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900">HR Overview</h1>
                    <p className="text-sm text-gray-400 mt-1">Human Resources / Dashboard</p>
                </div>
                <div className="flex gap-2 items-center">
                    <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Employees" value={loading ? '…' : (totalEmployees ?? '—')}
                    sub="active in system" icon={<UsersIcon className="w-5 h-5" />} color="text-blue-600" />
                <StatCard label="Payrolls This Month" value={payrollLoading ? '…' : payrolls.length}
                    sub={`${MONTHS[filterMonth - 1]} ${filterYear}`}
                    icon={<BanknoteIcon className="w-5 h-5" />} color="text-indigo-600" />
                <StatCard label="Payrolls Approved" value={payrollLoading ? '…' : approvedCount}
                    icon={<CheckCircleIcon className="w-5 h-5" />} color="text-green-600" />
                <StatCard label="Expiring Contracts" value={loading ? '…' : expiringContracts}
                    sub="within 30 days" icon={<FileTextIcon className="w-5 h-5" />} color="text-amber-500" />
            </div>

            {/* Payroll trend */}
            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Payroll — 6-Month Net Salary Trend</h2>
                <PayrollTrendChart points={trendPoints} loading={trendLoading} />
            </div>

            {/* Payroll cost breakdown + status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">
                        Payroll Cost Breakdown — {MONTHS[filterMonth - 1]} {filterYear}
                    </h2>
                    {payrollLoading
                        ? <div className="h-28 flex items-center justify-center text-sm text-gray-400">Loading…</div>
                        : <PayrollCostBreakdownBar payrolls={payrolls} />}
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">
                        Payroll Status — {MONTHS[filterMonth - 1]} {filterYear}
                    </h2>
                    {payrollLoading
                        ? <div className="h-20 flex items-center justify-center text-sm text-gray-400">Loading…</div>
                        : <PayrollStatusBreakdown payrolls={payrolls} />}
                </div>
            </div>

            {/* Headcount chart + contract types + leave rate */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Contract Type Distribution</h2>
                    <ContractTypeChart contracts={contracts} />
                </div>
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Leave Approval Rate</h2>
                    <LeaveApprovalRateChart leaves={allLeaves} />
                </div>
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-5 overflow-hidden">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Headcount by Department</h2>
                    <DeptHeadcountChart data={deptCounts} />
                </div>
            </div>

            {/* Pending approvals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">
                        Pending Leave Approvals
                        {pendingLeaves.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">{pendingLeaves.length}</span>
                        )}
                    </h2>
                    <ApprovalMiniTable type="leave" items={pendingLeaves} loading={approvalLoading}
                        onApprove={handleApproveLeave} onReject={handleRejectLeave} />
                    <button onClick={() => window.location.href = '/managers/request'}
                        className="mt-2 text-xs text-blue-600 hover:underline">Manage all →</button>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">
                        Pending OT Approvals
                        {pendingOT.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">{pendingOT.length}</span>
                        )}
                    </h2>
                    <ApprovalMiniTable type="ot" items={pendingOT} loading={approvalLoading}
                        onApprove={handleApproveOT} onReject={handleRejectOT} />
                </div>
            </div>
        </div>
    );
}
