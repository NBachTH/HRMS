"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { UsersIcon, UserCheckIcon, PlaneIcon, ClipboardListIcon } from 'lucide-react';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { getAllLeaves, approveLeave, rejectLeave } from '@/app/services/LeaveService';
import { getAllOTRequests, approveOTRequest, rejectOTRequest } from '@/app/services/OTRequestService';
import { getDepartments } from '@/app/services/DepartmentService';
import { getEmployees } from '@/app/services/EmployeeService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { EmployeeDashboard } from './EmployeeDashboard';
import { ApprovalMiniTable } from './ApprovalMiniTable';
import { RequestStatusPieChart } from './RequestStatusPieChart';
import { DeptStatusDonut } from './DeptStatusDonut';
import { DeptMemberTable } from './DeptMemberTable';
import type { LeaveRequest, OTRequest, Employee, Department } from '@/app/commons/types';

interface StatCardProps { label: string; value: string | number; icon: React.ReactNode; color: string; }
function StatCard({ label, value, icon, color }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-5 flex items-start gap-4">
            <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

export function ManagerDashboard() {
    const { role, user } = useAuth();
    const { showToast } = useToast();
    const isManager = role === 'MANAGER';

    // Approval filter: LEADER sees TO_APPROVE, MANAGER sees LEADER_APPROVED
    const approvalStatus = isManager ? 'LEADER_APPROVED' : 'TO_APPROVE';

    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
    const [deptEmployees, setDeptEmployees] = useState<Employee[]>([]);
    const [myDept, setMyDept] = useState<Department | null>(null);
    const [approvalLoading, setApprovalLoading] = useState(true);
    const [deptLoading, setDeptLoading] = useState(false);

    const fetchApprovals = useCallback(async () => {
        setApprovalLoading(true);
        try {
            const [lRes, otRes] = await Promise.all([
                getAllLeaves(approvalStatus, 0, 10),
                getAllOTRequests(approvalStatus, 0, 10),
            ]);
            if (lRes.success) setLeaves(lRes.data?.content ?? []);
            if (otRes.success) setOtRequests(otRes.data?.content ?? []);
        } catch { /* silent */ } finally {
            setApprovalLoading(false);
        }
    }, [approvalStatus]);

    // MANAGER only: load department members
    const fetchDeptData = useCallback(async () => {
        if (!isManager) return;
        setDeptLoading(true);
        try {
            const deptRes = await getDepartments();
            const depts = deptRes.success ? (deptRes.data as Department[]) : [];
            // find the department this manager manages
            const managed = depts.find(d => d.managerId === user?.employeeId) ?? depts[0] ?? null;
            setMyDept(managed);
            if (managed) {
                const empRes = await getEmployees(0, 50, managed.departmentId);
                if (empRes.success) setDeptEmployees(empRes.data?.content ?? []);
            }
        } catch { /* silent */ } finally {
            setDeptLoading(false);
        }
    }, [isManager, user?.employeeId]);

    useEffect(() => { fetchApprovals(); }, [fetchApprovals]);
    useEffect(() => { fetchDeptData(); }, [fetchDeptData]);

    const handleApproveLeave = async (id: string) => {
        try { await approveLeave(id); showToast('Leave approved'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed to approve', 'error'); }
    };
    const handleRejectLeave = async (id: string) => {
        try { await rejectLeave(id); showToast('Leave rejected'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed to reject', 'error'); }
    };
    const handleApproveOT = async (id: string) => {
        try { await approveOTRequest(id); showToast('OT approved'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed to approve', 'error'); }
    };
    const handleRejectOT = async (id: string) => {
        try { await rejectOTRequest(id); showToast('OT rejected'); fetchApprovals(); }
        catch (err: any) { showToast(err?.body?.message || 'Failed to reject', 'error'); }
    };

    const pendingLeaveCount = leaves.filter(l => l.status === approvalStatus).length;
    const pendingOTCount = otRequests.filter(o => o.status === approvalStatus).length;

    return (
        <div>
            {/* Inherit all employee sections */}
            <EmployeeDashboard />

            {/* Team approvals section */}
            <div className="px-8 pb-6 space-y-4">
                <div className="border-t border-gray-100 pt-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Team Approvals</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        {isManager ? 'Requests approved by leader, awaiting your approval' : 'Requests awaiting your approval'}
                    </p>
                </div>

                {/* Approval tables + status pie */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Leave Requests
                            {pendingLeaveCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                    {pendingLeaveCount}
                                </span>
                            )}
                        </h3>
                        <ApprovalMiniTable
                            type="leave"
                            items={leaves}
                            loading={approvalLoading}
                            onApprove={handleApproveLeave}
                            onReject={handleRejectLeave}
                        />
                        <button onClick={() => window.location.href = '/managers/request'}
                            className="mt-2 text-xs text-blue-600 hover:underline">
                            View all →
                        </button>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            OT Requests
                            {pendingOTCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                    {pendingOTCount}
                                </span>
                            )}
                        </h3>
                        <ApprovalMiniTable
                            type="ot"
                            items={otRequests}
                            loading={approvalLoading}
                            onApprove={handleApproveOT}
                            onReject={handleRejectOT}
                        />
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Request Status Breakdown</h3>
                        <RequestStatusPieChart leaves={leaves} otRequests={otRequests} />
                    </div>
                </div>

                {/* MANAGER only — Department section */}
                {isManager && (
                    <>
                        <div className="border-t border-gray-100 pt-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-1">
                                Department Overview
                                {myDept && <span className="ml-2 text-base font-normal text-gray-500">— {myDept.departmentName}</span>}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total Headcount" value={deptLoading ? '…' : deptEmployees.length}
                                icon={<UsersIcon className="w-5 h-5" />} color="text-indigo-600" />
                            <StatCard label="Active" value={deptLoading ? '…' : deptEmployees.filter(e => e.status === 'ACTIVE').length}
                                icon={<UserCheckIcon className="w-5 h-5" />} color="text-green-600" />
                            <StatCard label="On Leave" value={deptLoading ? '…' : deptEmployees.filter(e => e.status === 'ON_LEAVE').length}
                                icon={<PlaneIcon className="w-5 h-5" />} color="text-amber-500" />
                            <StatCard label="Pending Requests" value={pendingLeaveCount + pendingOTCount}
                                icon={<ClipboardListIcon className="w-5 h-5" />} color="text-red-500" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg shadow-sm p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Member Status</h3>
                                <DeptStatusDonut employees={deptEmployees} />
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Department Members</h3>
                                <DeptMemberTable employees={deptEmployees} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
