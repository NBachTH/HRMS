"use client";

import React, { useEffect, useState } from "react";
import {
    FileTextIcon,
    BarChart3Icon,
    ClipboardListIcon,
    UsersIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    BuildingIcon,
    CalendarIcon,
    ClockIcon,
    BanknoteIcon,
    SettingsIcon,
    CheckSquareIcon,
    CalendarCheckIcon,
    MonitorIcon,
    ScrollTextIcon,
    BellIcon,
    UserIcon,
    XCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/commons/contexts/AuthContext";

const STORAGE_KEY = "sidebar-collapsed-v1";

export function Sidebar() {
    const router = useRouter();
    const { role } = useAuth();
    const [collapsed, setCollapsed] = useState<boolean>(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw !== null) setCollapsed(raw === "true");
        } catch { }
    }, []);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false"); } catch { }
    }, [collapsed]);

    const asideWidthClass = collapsed ? "w-20" : "w-64";
    const buttonContentClass = collapsed ? "justify-center" : "justify-start";
    const expandContentClass = collapsed ? "justify-center" : "justify-between";

    const isManager = role === "MANAGER" || role === "LEADER" || role === "HR_ADMIN";

    const NavButton: React.FC<
        React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: React.ReactNode }
    > = ({ label, icon, ...props }) => (
        <button
            {...props}
            title={label}
            className={`w-full flex items-center ${buttonContentClass} gap-3 px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors`}
        >
            <span className="flex-none">{icon}</span>
            {!collapsed && <span className="ml-1 text-sm">{label}</span>}
        </button>
    );

    const SectionLabel = ({ label }: { label: string }) =>
        collapsed ? null : (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                {label}
            </p>
        );

    return (
        <aside
            className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ease-in-out ${asideWidthClass}`}
            aria-label="Main sidebar"
        >
            <div className={`flex items-center ${expandContentClass} p-4`}>
                {!collapsed && (
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-blue-900">HRMS</h1>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(s => !s)}
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                    {collapsed ? <ChevronRightIcon className="w-5 h-5 text-gray-600" /> : <ChevronLeftIcon className="w-5 h-5 text-gray-600" />}
                </button>
            </div>

            <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                {/* PERSONAL — visible to all */}
                <div className="mb-4">
                    <SectionLabel label="Personal" />
                    <NavButton onClick={() => router.push("/employees/dashboard")} label="Dashboard" icon={<BarChart3Icon className="w-5 h-5" />} />
                    <NavButton onClick={() => router.push("/employees/me")} label="My Profile" icon={<UserIcon className="w-5 h-5" />} />
                    <NavButton onClick={() => router.push("/employees/attendance")} label="My Attendance" icon={<CalendarIcon className="w-5 h-5" />} />
                    <NavButton onClick={() => router.push("/employees/leave")} label="Leave Requests" icon={<ClipboardListIcon className="w-5 h-5" />} />
                    <NavButton onClick={() => router.push("/employees/ot")} label="OT Requests" icon={<ClockIcon className="w-5 h-5" />} />
                    <NavButton onClick={() => router.push("/employees/payroll")} label="My Payslips" icon={<BanknoteIcon className="w-5 h-5" />} />
                    <NavButton onClick={() => router.push("/notifications")} label="Notifications" icon={<BellIcon className="w-5 h-5" />} />
                </div>

                {/* MANAGER — visible to MANAGER, LEADER, HR_ADMIN */}
                {isManager && (
                    <div className="mb-4">
                        <SectionLabel label="Manager" />
                        <NavButton onClick={() => router.push("/managers/request")} label="Pending Requests" icon={<ClipboardListIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/managers/department")} label="Departments" icon={<BuildingIcon className="w-5 h-5" />} />
                        {(role === "MANAGER" || role === "LEADER") && (
                            <NavButton onClick={() => router.push("/hr/attendance")} label="Attendance" icon={<CalendarIcon className="w-5 h-5" />} />
                        )}
                    </div>
                )}

                {/* HR ADMIN — visible to HR_ADMIN */}
                {role === "HR_ADMIN" && (
                    <div className="mb-4">
                        <SectionLabel label="HR Admin" />
                        <NavButton onClick={() => router.push("/hr/employee")} label="Employees" icon={<UsersIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/contract")} label="Contracts" icon={<FileTextIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/attendance")} label="Attendance" icon={<CalendarIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/attendance/close-period")} label="Close Period" icon={<XCircleIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/holidays")} label="Public Holidays" icon={<CalendarCheckIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/devices")} label="Devices" icon={<MonitorIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/checkin-log")} label="Checkin Log" icon={<ScrollTextIcon className="w-5 h-5" />} />
                    </div>
                )}

                {/* FINANCE ADMIN */}
                {role === "FINANCE_ADMIN" && (
                    <div className="mb-4">
                        <SectionLabel label="Finance" />
                        <NavButton onClick={() => router.push("/finance/payroll")} label="Payroll" icon={<BanknoteIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/finance/reports")} label="Reports" icon={<BarChart3Icon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/contract")} label="Contracts" icon={<FileTextIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/holidays")} label="Public Holidays" icon={<CalendarCheckIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/system/config")} label="Payroll Config" icon={<SettingsIcon className="w-5 h-5" />} />
                    </div>
                )}

                {/* DIRECTOR */}
                {role === "DIRECTOR" && (
                    <div className="mb-4">
                        <SectionLabel label="Director" />
                        <NavButton onClick={() => router.push("/director/approvals")} label="Payroll Approvals" icon={<CheckSquareIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/finance/reports")} label="Reports" icon={<BarChart3Icon className="w-5 h-5" />} />
                    </div>
                )}

                {/* SYSTEM ADMIN */}
                {role === "SYSTEM_ADMIN" && (
                    <div className="mb-4">
                        <SectionLabel label="System" />
                        <NavButton onClick={() => router.push("/hr/employee")} label="Employees" icon={<UsersIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/system/config")} label="Payroll Config" icon={<SettingsIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/devices")} label="Devices" icon={<MonitorIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/hr/checkin-log")} label="Checkin Log" icon={<ScrollTextIcon className="w-5 h-5" />} />
                        <NavButton onClick={() => router.push("/director/approvals")} label="Payroll Approvals" icon={<CheckSquareIcon className="w-5 h-5" />} />
                    </div>
                )}
            </nav>
        </aside>
    );
}
