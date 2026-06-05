"use client";
import React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import type { LeaveRequest, OTRequest } from '@/app/commons/types';

const STATUS_STYLE: Record<string, string> = {
    TO_APPROVE: 'bg-yellow-100 text-yellow-700',
    LEADER_APPROVED: 'bg-blue-100 text-blue-700',
    MANAGER_APPROVED: 'bg-indigo-100 text-indigo-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
};

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

interface LeaveProps {
    type: 'leave';
    items: LeaveRequest[];
    loading?: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}
interface OTProps {
    type: 'ot';
    items: OTRequest[];
    loading?: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}
type Props = LeaveProps | OTProps;

export function ApprovalMiniTable({ type, items, loading, onApprove, onReject }: Props) {
    if (loading) {
        return <div className="py-6 text-center text-sm text-gray-400">Loading…</div>;
    }

    if (items.length === 0) {
        return (
            <div className="py-6 text-center text-sm text-gray-400">
                No pending {type === 'leave' ? 'leave' : 'OT'} requests
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                        {type === 'leave' && (
                            <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        )}
                        <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {items.map((r) => {
                        const item = r as any;
                        const id = type === 'leave' ? item.leaveRequestId : item.otRequestId;
                        return (
                            <tr key={id} className="hover:bg-gray-50">
                                <td className="py-2 pr-3 font-medium text-gray-800 text-xs whitespace-nowrap">
                                    {item.employeeName || item.employeeId}
                                </td>
                                <td className="py-2 pr-3 text-gray-600 text-xs whitespace-nowrap">
                                    {fmtDate(item.startTime)} – {fmtDate(item.endTime)}
                                </td>
                                {type === 'leave' && (
                                    <td className="py-2 pr-3 text-gray-500 text-xs max-w-[100px] truncate" title={item.reason}>
                                        {item.reason || '—'}
                                    </td>
                                )}
                                <td className="py-2 pr-3">
                                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${STATUS_STYLE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="py-2">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => onApprove(id)}
                                            className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                                            title="Approve">
                                            <CheckIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => onReject(id)}
                                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                                            title="Reject">
                                            <XIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
