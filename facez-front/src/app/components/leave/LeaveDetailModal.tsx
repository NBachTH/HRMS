"use client";

import React, { useState } from 'react';
import { Modal } from '@/app/components/common/Modal';
import { ApprovalStepper } from '@/app/components/common/ApprovalStepper';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { deleteLeave, submitLeave } from '@/app/services/LeaveService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { formatDateTime } from '@/app/commons/utils/formatters';
import type { LeaveRequest } from '@/app/commons/types';

interface Props {
    leave: LeaveRequest | null;
    onClose: () => void;
    onChanged: () => void;   // refresh list after a mutation
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
            <div className="text-sm text-gray-800">{children ?? '—'}</div>
        </div>
    );
}

export function LeaveDetailModal({ leave, onClose, onChanged }: Props) {
    const { showToast } = useToast();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!leave) return null;

    const days = leave.durationHours != null
        ? Math.round((leave.durationHours / 8) * 100) / 100
        : null;
    const isDraft = leave.status === 'DRAFT';

    const handleCancel = async () => {
        setBusy(true);
        try {
            await deleteLeave(leave.leaveRequestId);
            showToast('Leave request cancelled');
            setConfirmDelete(false);
            onChanged();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to cancel', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = async () => {
        setBusy(true);
        try {
            await submitLeave(leave.leaveRequestId);
            showToast('Leave request submitted');
            onChanged();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to submit', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={!!leave} onClose={onClose} title="Leave Request Detail" width="max-w-2xl">
            <div className="space-y-5">
                <ApprovalStepper status={leave.status} />

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Employee">{leave.employeeName || leave.employeeId}</Field>
                    <Field label="Leave Type">{leave.leaveType?.replace(/_/g, ' ') ?? '—'}</Field>
                    <Field label="From">{formatDateTime(leave.startTime)}</Field>
                    <Field label="To">{formatDateTime(leave.endTime)}</Field>
                    <Field label="Duration">
                        {days != null ? `${days} days · ${leave.durationHours} hours` : '—'}
                    </Field>
                    <Field label="Balance deducted">
                        {leave.balanceDeducted
                            ? <span className="text-green-600">Yes</span>
                            : <span className="text-gray-400">No</span>}
                    </Field>
                    <div className="col-span-2">
                        <Field label="Reason">{leave.reason}</Field>
                    </div>
                    <Field label="Created">{formatDateTime(leave.createdAt)}</Field>
                    <Field label="Last updated">{formatDateTime(leave.updatedAt)}</Field>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                    {isDraft && (
                        <>
                            <button onClick={() => setConfirmDelete(true)} disabled={busy}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                                Cancel Request
                            </button>
                            <button onClick={handleSubmit} disabled={busy}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {busy ? 'Submitting…' : 'Submit'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                title="Cancel leave request"
                message="Are you sure you want to cancel this leave request? Reserved balance will be released."
                danger
                loading={busy}
                onConfirm={handleCancel}
                onCancel={() => setConfirmDelete(false)}
            />
        </Modal>
    );
}
