"use client";

import React from 'react';
import { Modal } from '@/app/components/common/Modal';
import { ApprovalStepper } from '@/app/components/common/ApprovalStepper';
import { formatDateTime } from '@/app/commons/utils/formatters';
import type { OTRequest } from '@/app/commons/types';

interface Props {
    ot: OTRequest | null;
    onClose: () => void;
    onChanged: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
            <div className="text-sm text-gray-800">{children ?? '—'}</div>
        </div>
    );
}

function hoursBetween(from?: string, to?: string): number {
    if (!from || !to) return 0;
    const mins = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
    return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
}

export function OTDetailModal({ ot, onClose }: Props) {
    if (!ot) return null;

    return (
        <Modal isOpen={!!ot} onClose={onClose} title="OT Request Detail" width="max-w-2xl">
            <div className="space-y-5">
                <ApprovalStepper status={ot.status} />

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Employee">{ot.employeeName || ot.employeeId}</Field>
                    <Field label="OT Plan">{ot.otPlanId ?? '—'}</Field>
                    <Field label="Actual Start">{formatDateTime(ot.startTime)}</Field>
                    <Field label="Actual End">{formatDateTime(ot.endTime)}</Field>
                    <Field label="Duration">{hoursBetween(ot.startTime, ot.endTime).toFixed(2)}h</Field>
                    <Field label="Status">{ot.status?.replace(/_/g, ' ')}</Field>
                    <Field label="Created">{formatDateTime(ot.createdAt)}</Field>
                    <Field label="Last updated">{formatDateTime(ot.updatedAt)}</Field>
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
