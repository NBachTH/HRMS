"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarIcon, ClockIcon, BanknoteIcon, AlertCircleIcon } from 'lucide-react';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { getAttendances } from '@/app/services/AttendanceService';
import { getLeaves } from '@/app/services/LeaveService';
import { getOTRequests } from '@/app/services/OTRequestService';
import { getMyPayrolls } from '@/app/services/PayrollService';
import { WorkingHoursBarChart } from './WorkingHoursBarChart';
import { AttendanceSummaryDonut } from './AttendanceSummaryDonut';
import { MySalaryTrendChart } from './MySalaryTrendChart';
import { AttendanceMonthTable } from './AttendanceMonthTable';
import { MiniRequestTable } from './MiniRequestTable';
import { AttendanceCalendar } from '@/app/components/attendance/AttendanceCalendar';
import type { Attendance, LeaveRequest, OTRequest, Payroll } from '@/app/commons/types';

function fmtVND(v: number | null | undefined) {
    if (v == null) return '—';
    return new Intl.NumberFormat('vi-VN').format(v) + ' ₫';
}

function padDate(n: number) { return String(n).padStart(2, '0'); }

function monthRange(year: number, month: number) {
    const from = `${year}-${padDate(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${padDate(month)}-${padDate(lastDay)}`;
    return { from, to };
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
}

function StatCard({ icon, label, value, sub, color = 'text-blue-600' }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-5 flex items-start gap-4">
            <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export function EmployeeDashboard() {
    const { user } = useAuth();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [attLoading, setAttLoading] = useState(true);
    const [mainLoading, setMainLoading] = useState(true);

    // Fetch attendance for selected month
    const fetchAttendance = useCallback(async (y: number, m: number) => {
        setAttLoading(true);
        try {
            const { from, to } = monthRange(y, m);
            const res = await getAttendances({ from, to, page: 0, size: 31 });
            if (res.success) setAttendance(res.data?.content ?? []);
        } catch { /* silent */ } finally {
            setAttLoading(false);
        }
    }, []);

    // Fetch all other data once on mount
    useEffect(() => {
        const load = async () => {
            setMainLoading(true);
            try {
                const [lRes, otRes, pRes] = await Promise.all([
                    getLeaves(0, 10),
                    getOTRequests(0, 10),
                    getMyPayrolls(0, 6),
                ]);
                if (lRes.success) setLeaves(lRes.data?.content ?? []);
                if (otRes.success) setOtRequests(otRes.data?.content ?? []);
                if (pRes.success) setPayrolls(pRes.data?.content ?? []);
            } catch { /* silent */ } finally {
                setMainLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => { fetchAttendance(year, month); }, [year, month, fetchAttendance]);

    const workingDays = attendance.reduce((s, r) => s + (r.workingDay ?? 0), 0);
    const lateDays = attendance.filter(r => r.violate).length;
    const pendingLeaves = leaves.filter(l => l.status === 'TO_APPROVE').length;
    const latestSalary = payrolls.length > 0 ? payrolls[0].netSalary : null;

    const handlePeriodChange = (y: number, m: number) => { setYear(y); setMonth(m); };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-blue-900">
                    Welcome back, {user?.username ?? '…'}
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                    {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Attendance calendar (monthly) */}
            <div className="bg-white rounded-lg shadow-sm">
                <AttendanceCalendar />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<CalendarIcon className="w-5 h-5" />}
                    label="Working Days (MTD)" value={workingDays}
                    sub="days worked this month" color="text-blue-600" />
                <StatCard icon={<AlertCircleIcon className="w-5 h-5" />}
                    label="Late Days (MTD)" value={lateDays}
                    sub="days with late check-in" color="text-amber-500" />
                <StatCard icon={<ClockIcon className="w-5 h-5" />}
                    label="Pending Leaves" value={pendingLeaves}
                    sub="awaiting approval" color="text-indigo-500" />
                <StatCard icon={<BanknoteIcon className="w-5 h-5" />}
                    label="Latest Net Salary" value={mainLoading ? '…' : fmtVND(latestSalary)}
                    sub="most recent payslip" color="text-green-600" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Daily Working Hours — This Month</h2>
                    <WorkingHoursBarChart records={attendance} />
                    <p className="text-xs text-gray-400 mt-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-500 mr-1" />On-time
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400 ml-3 mr-1" />Late
                        <span className="ml-2 text-gray-300">— dashed line = 8h standard</span>
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-1">Month Summary</h2>
                    <AttendanceSummaryDonut records={attendance} year={year} month={month} />
                </div>
            </div>

            {/* Salary trend */}
            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">My Salary — Last 6 Months</h2>
                {mainLoading
                    ? <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
                    : <MySalaryTrendChart payrolls={payrolls} />}
            </div>

            {/* Attendance table */}
            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Attendance Detail</h2>
                <AttendanceMonthTable
                    records={attendance}
                    loading={attLoading}
                    year={year}
                    month={month}
                    onPeriodChange={handlePeriodChange}
                />
            </div>

            {/* Request mini-tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">My Leave Requests</h2>
                    <MiniRequestTable type="leave" items={leaves} linkTo="/employees/leave" />
                </div>
                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">My OT Requests</h2>
                    <MiniRequestTable type="ot" items={otRequests} linkTo="/employees/ot" />
                </div>
            </div>
        </div>
    );
}
