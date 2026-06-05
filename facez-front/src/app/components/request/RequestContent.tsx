"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { getAllLeaves, approveLeave, rejectLeave } from '@/app/services/LeaveService';
import { getAllOTRequests, approveOTRequest, rejectOTRequest } from '@/app/services/OTRequestService';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { LeaveRequest, OTRequest } from '@/app/commons/types';

/**
 * Each approver role sees requests at their pending step:
 *   LEADER   → TO_APPROVE
 *   MANAGER  → LEADER_APPROVED
 *   HR_ADMIN → MANAGER_APPROVED
 */
const PENDING_STATUS_FOR_ROLE: Record<string, string> = {
    LEADER:   'TO_APPROVE',
    MANAGER:  'LEADER_APPROVED',
    HR_ADMIN: 'MANAGER_APPROVED',
};

const STEP_LABEL: Record<string, string> = {
    LEADER:   'Level 1 — LEADER review',
    MANAGER:  'Level 2 — MANAGER review',
    HR_ADMIN: 'Final — HR Admin confirmation',
};

export function RequestContent() {
    const { role } = useAuth();
    const { showToast } = useToast();
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pendingStatus = role ? PENDING_STATUS_FOR_ROLE[role] : null;

    const fetchData = useCallback(async () => {
        if (!pendingStatus) return;
        setLoading(true);
        setError(null);
        try {
            const [leavesRes, otRes] = await Promise.all([
                getAllLeaves(pendingStatus, 0, 100),
                getAllOTRequests(pendingStatus, 0, 100),
            ]);
            if (leavesRes.success && leavesRes.data) {
                setLeaveRequests(leavesRes.data.content);
            }
            if (otRes.success && otRes.data) {
                setOtRequests(otRes.data.content);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    }, [pendingStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAction = async (action: () => Promise<any>, successMsg: string) => {
        try {
            await action();
            showToast(successMsg);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Action failed', 'error');
        }
    };

    if (!pendingStatus) {
        return (
            <div className="p-8 text-center text-gray-500">
                Your role does not have approval permissions.
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading requests...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const stepLabel = role ? STEP_LABEL[role] : '';

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-1">Pending Requests</h1>
                <p className="text-sm text-gray-500">{stepLabel}</p>
            </div>

            {/* Leave Requests */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Leave Requests
                        <span className="ml-2 px-2 py-0.5 text-sm bg-yellow-100 text-yellow-800 rounded-full">{leaveRequests.length}</span>
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leaveRequests.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-400">No pending leave requests</td></tr>
                            ) : leaveRequests.map((lr, i) => {
                                const days = lr.startTime && lr.endTime
                                    ? Math.ceil((new Date(lr.endTime).getTime() - new Date(lr.startTime).getTime()) / 86400000) + 1
                                    : '—';
                                return (
                                    <tr key={lr.leaveRequestId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm">{i + 1}</td>
                                        <td className="px-6 py-4 text-sm font-medium">{lr.employeeName || lr.employeeId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{lr.reason}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {lr.startTime ? new Date(lr.startTime).toLocaleDateString() : ''} — {lr.endTime ? new Date(lr.endTime).toLocaleDateString() : ''}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">{days}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleAction(() => approveLeave(lr.leaveRequestId), 'Leave request approved')}
                                                    className="w-8 h-8 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full"
                                                    title="Approve"
                                                >
                                                    <CheckIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(() => rejectLeave(lr.leaveRequestId), 'Leave request rejected')}
                                                    className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full"
                                                    title="Reject"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* OT Requests */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">
                        OT Requests
                        <span className="ml-2 px-2 py-0.5 text-sm bg-yellow-100 text-yellow-800 rounded-full">{otRequests.length}</span>
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {otRequests.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400">No pending OT requests</td></tr>
                            ) : otRequests.map((ot, i) => (
                                <tr key={ot.otRequestId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm">{i + 1}</td>
                                    <td className="px-6 py-4 text-sm font-medium">{ot.employeeName || ot.employeeId}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{ot.startTime ? new Date(ot.startTime).toLocaleString() : ''}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{ot.endTime ? new Date(ot.endTime).toLocaleString() : ''}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleAction(() => approveOTRequest(ot.otRequestId), 'OT request approved')}
                                                className="w-8 h-8 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full"
                                                title="Approve"
                                            >
                                                <CheckIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleAction(() => rejectOTRequest(ot.otRequestId), 'OT request rejected')}
                                                className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full"
                                                title="Reject"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
