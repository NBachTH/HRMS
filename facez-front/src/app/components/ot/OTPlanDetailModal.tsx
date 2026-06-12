"use client";

import React, { useState } from 'react';
import { Modal } from '@/app/components/common/Modal';
import { RejectReasonModal } from '@/app/components/common/RejectReasonModal';
import { approveOTPlan, rejectOTPlan } from '@/app/services/OTPlanService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { formatDate } from '@/app/commons/utils/formatters';
import type { OTPlan } from '@/app/commons/types';

interface Props {
    plan: OTPlan | null;
    onClose: () => void;
    onChanged: () => void;
}

const hhmm = (t?: string) => (t ? t.slice(0, 5) : '—');

function statusBadge(status: string) {
    const styles: Record<string, string> = {
        TO_APPROVE: 'bg-yellow-100 text-yellow-800',
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
}

export function OTPlanDetailModal({ plan, onClose, onChanged }: Props) {
    const { showToast } = useToast();
    const { role } = useAuth();
    const [busy, setBusy] = useState(false);
    const [showReject, setShowReject] = useState(false);

    if (!plan) return null;

    const canDecide = (role === 'MANAGER' || role === 'HR_ADMIN') && plan.status === 'TO_APPROVE';

    const handleApprove = async () => {
        setBusy(true);
        try {
            await approveOTPlan(plan.id);
            showToast('OT plan approved');
            onChanged();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to approve', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleReject = async (reason: string) => {
        setBusy(true);
        try {
            await rejectOTPlan(plan.id, reason);
            showToast('OT plan rejected');
            setShowReject(false);
            onChanged();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to reject', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={!!plan} onClose={onClose} title="OT Plan Detail" width="max-w-2xl">
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs font-medium text-gray-500 mb-0.5">OT Date</div>
                        <div className="text-sm text-gray-800">{formatDate(plan.otDate)}</div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-gray-500 mb-0.5">Status</div>
                        <div>{statusBadge(plan.status)}</div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-gray-500 mb-0.5">Planned Window</div>
                        <div className="text-sm text-gray-800">{hhmm(plan.plannedStartTime)} – {hhmm(plan.plannedEndTime)}</div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-gray-500 mb-0.5">Created By</div>
                        <div className="text-sm text-gray-800">{plan.createdBy ?? '—'}</div>
                    </div>
                    <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-500 mb-0.5">Reason</div>
                        <div className="text-sm text-gray-800">{plan.reason || '—'}</div>
                    </div>
                    {plan.status === 'REJECTED' && plan.rejectionReason && (
                        <div className="col-span-2">
                            <div className="text-xs font-medium text-gray-500 mb-0.5">Rejection Reason</div>
                            <div className="text-sm text-red-600">{plan.rejectionReason}</div>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Assigned Employees <span className="text-gray-400 font-normal">({plan.employees?.length ?? 0})</span>
                    </h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-3 py-2 text-left">#</th>
                                    <th className="px-3 py-2 text-left">Employee</th>
                                    <th className="px-3 py-2 text-left">ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(plan.employees ?? []).map((e, i) => (
                                    <tr key={e.employeeId}>
                                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                                        <td className="px-3 py-2 text-gray-800">{e.employeeName || e.employeeId}</td>
                                        <td className="px-3 py-2 text-gray-500">{e.employeeId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                    {canDecide && (
                        <>
                            <button onClick={() => setShowReject(true)} disabled={busy}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                                Reject
                            </button>
                            <button onClick={handleApprove} disabled={busy}
                                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                                {busy ? 'Approving…' : 'Approve'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <RejectReasonModal
                isOpen={showReject}
                title="Reject OT Plan"
                loading={busy}
                onClose={() => setShowReject(false)}
                onConfirm={handleReject}
            />
        </Modal>
    );
}
