"use client";

import React from 'react';

/**
 * Reusable approval-progress stepper for workflow entities (Leave / OT / Payroll).
 * Mirrors the VMS status bar: highlights the current stage; shows a red banner
 * when the entity is rejected.
 */

type Variant = 'request' | 'payroll';

interface Step {
    key: string;
    label: string;
}

const REQUEST_STEPS: Step[] = [
    { key: 'DRAFT', label: 'To Submit' },
    { key: 'TO_APPROVE', label: 'To Approve' },
    { key: 'LEADER_APPROVED', label: 'Leader' },
    { key: 'MANAGER_APPROVED', label: 'Manager' },
    { key: 'APPROVED', label: 'Approved' },
];

const PAYROLL_STEPS: Step[] = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'PENDING_APPROVAL', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'PAID', label: 'Paid' },
];

interface Props {
    status: string;
    variant?: Variant;
}

export function ApprovalStepper({ status, variant = 'request' }: Props) {
    const steps = variant === 'payroll' ? PAYROLL_STEPS : REQUEST_STEPS;
    const rejected = status === 'REJECTED';
    const currentIdx = steps.findIndex(s => s.key === status);

    if (rejected) {
        return (
            <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-700">Rejected</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 overflow-x-auto">
            {steps.map((step, i) => {
                const done = currentIdx >= 0 && i < currentIdx;
                const active = i === currentIdx || (currentIdx < 0 && i === 0);
                return (
                    <React.Fragment key={step.key}>
                        <div
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium
                                ${active ? 'bg-blue-600 text-white'
                                    : done ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-400'}`}
                        >
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px]
                                ${active ? 'bg-white text-blue-600'
                                    : done ? 'bg-blue-500 text-white'
                                        : 'bg-gray-300 text-white'}`}>
                                {done ? '✓' : i + 1}
                            </span>
                            {step.label}
                        </div>
                        {i < steps.length - 1 && (
                            <span className={`h-px w-4 ${done ? 'bg-blue-300' : 'bg-gray-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
