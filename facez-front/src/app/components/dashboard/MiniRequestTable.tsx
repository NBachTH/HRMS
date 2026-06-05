"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import type { LeaveRequest, OTRequest } from '@/app/commons/types';

const STATUS_STYLE: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    TO_APPROVE: 'bg-yellow-100 text-yellow-700',
    LEADER_APPROVED: 'bg-blue-100 text-blue-700',
    MANAGER_APPROVED: 'bg-indigo-100 text-indigo-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
};

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface LeaveProps {
    type: 'leave';
    items: LeaveRequest[];
    linkTo: string;
}
interface OTProps {
    type: 'ot';
    items: OTRequest[];
    linkTo: string;
}
type Props = LeaveProps | OTProps;

export function MiniRequestTable({ type, items, linkTo }: Props) {
    const router = useRouter();

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                            {type === 'leave' && (
                                <th className="py-2 pr-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                            )}
                            <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.length === 0 ? (
                            <tr><td colSpan={type === 'leave' ? 3 : 2} className="py-5 text-center text-gray-400 text-xs">No records</td></tr>
                        ) : items.map((r) => {
                            const isLeave = type === 'leave';
                            const item = r as any;
                            return (
                                <tr key={isLeave ? item.leaveRequestId : item.otRequestId} className="hover:bg-gray-50">
                                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap text-xs">
                                        {fmtDate(item.startTime)} – {fmtDate(item.endTime)}
                                    </td>
                                    {isLeave && (
                                        <td className="py-2 pr-3 text-gray-600 max-w-[120px] truncate text-xs" title={item.reason}>
                                            {item.reason || '—'}
                                        </td>
                                    )}
                                    <td className="py-2">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <button onClick={() => router.push(linkTo)}
                className="mt-2 text-xs text-blue-600 hover:underline">
                View all →
            </button>
        </div>
    );
}
