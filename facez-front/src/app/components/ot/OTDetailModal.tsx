"use client";

import React, { useState } from 'react';
import { Modal } from '@/app/components/common/Modal';
import { ApprovalStepper } from '@/app/components/common/ApprovalStepper';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { deleteOTRequest } from '@/app/services/OTRequestService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { formatDateTime } from '@/app/commons/utils/formatters';
import type { OTRequest } from '@/app/commons/types';
import { OT_RATE_BY_CATEGORY } from '@/app/commons/types';

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

export function OTDetailModal({ ot, onClose, onChanged }: Props) {
    const { showToast } = useToast();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!ot) return null;

    // Prefer master-detail lines; fall back to a single header-derived line.
    const lines = ot.lines && ot.lines.length > 0
        ? ot.lines
        : [{
            workDate: ot.startTime?.slice(0, 10) ?? '',
            fromTime: ot.startTime?.slice(11, 16) ?? '',
            toTime: ot.endTime?.slice(11, 16) ?? '',
            otCategory: 'WEEKDAY' as const,
            wfh: false,
            reason: '',
            registrationHours: hoursBetween(ot.startTime, ot.endTime),
        }];

    const totalHours = lines.reduce((s, l) => s + (l.registrationHours ?? 0), 0);
    const cancellable = ot.status === 'DRAFT' || ot.status === 'TO_APPROVE';

    const handleCancel = async () => {
        setBusy(true);
        try {
            await deleteOTRequest(ot.otRequestId);
            showToast('OT request cancelled');
            setConfirmDelete(false);
            onChanged();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to cancel', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={!!ot} onClose={onClose} title="OT Registration Detail" width="max-w-4xl">
            <div className="space-y-5">
                <ApprovalStepper status={ot.status} />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Employee">{ot.employeeName || ot.employeeId}</Field>
                    <Field label="Project">{ot.projectName ?? '—'}</Field>
                    <Field label="OT Month">{ot.otMonth ?? ot.startTime?.slice(0, 7) ?? '—'}</Field>
                    <Field label="Total registration hours">{(ot.totalRegistrationHours ?? totalHours).toFixed(2)}h</Field>
                    <Field label="Created">{formatDateTime(ot.createdAt)}</Field>
                    <Field label="Last updated">{formatDateTime(ot.updatedAt)}</Field>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">OT Request Lines</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-3 py-2 text-left">Date</th>
                                    <th className="px-3 py-2 text-left">From</th>
                                    <th className="px-3 py-2 text-left">To</th>
                                    <th className="px-3 py-2 text-left">Category</th>
                                    <th className="px-3 py-2 text-right">Rate</th>
                                    <th className="px-3 py-2 text-center">WFH</th>
                                    <th className="px-3 py-2 text-right">Hours</th>
                                    <th className="px-3 py-2 text-left">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {lines.map((l, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2 text-gray-700">{l.workDate || '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{l.fromTime || '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{l.toTime || '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{l.otCategory}</td>
                                        <td className="px-3 py-2 text-right text-gray-600">×{OT_RATE_BY_CATEGORY[l.otCategory].toFixed(1)}</td>
                                        <td className="px-3 py-2 text-center">{l.wfh ? '✓' : '—'}</td>
                                        <td className="px-3 py-2 text-right font-medium">{(l.registrationHours ?? 0).toFixed(2)}</td>
                                        <td className="px-3 py-2 text-gray-600">{l.reason || '—'}</td>
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
                    {cancellable && (
                        <button onClick={() => setConfirmDelete(true)}
                            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                            Cancel Request
                        </button>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                title="Cancel OT request"
                message="Are you sure you want to cancel this OT registration?"
                danger
                loading={busy}
                onConfirm={handleCancel}
                onCancel={() => setConfirmDelete(false)}
            />
        </Modal>
    );
}
