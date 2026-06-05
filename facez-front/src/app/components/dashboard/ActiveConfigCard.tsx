"use client";
import React from 'react';
import { CheckCircleIcon, AlertTriangleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SystemConfig, ConfigType } from '@/app/commons/types';

const TYPE_LABELS: Record<ConfigType, string> = {
    SALARY_GRADE: 'Salary Grade',
    ALLOWANCE: 'Allowance',
    PIT: 'Personal Income Tax',
    INSURANCE: 'Insurance',
};

interface Props {
    configType: ConfigType;
    config: SystemConfig | null;
}

export function ActiveConfigCard({ configType, config }: Props) {
    const router = useRouter();

    return (
        <div className={`rounded-lg border p-4 flex flex-col gap-2 ${config ? 'border-gray-200 bg-white' : 'border-red-300 bg-red-50'}`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {TYPE_LABELS[configType]}
                </span>
                {config
                    ? <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    : <AlertTriangleIcon className="w-4 h-4 text-red-500" />}
            </div>

            {config ? (
                <>
                    <p className="text-lg font-bold text-gray-900">{config.version}</p>
                    {config.effectiveDate && (
                        <p className="text-xs text-gray-500">Effective: {config.effectiveDate}</p>
                    )}
                    {config.legalBasis && (
                        <p className="text-xs text-gray-400 truncate" title={config.legalBasis}>
                            {config.legalBasis}
                        </p>
                    )}
                    <p className="text-xs text-gray-400">Updated by {config.updatedBy}</p>
                </>
            ) : (
                <div>
                    <p className="text-sm font-semibold text-red-600">No active config</p>
                    <p className="text-xs text-red-500 mt-0.5">Payroll engine will fail for this type</p>
                </div>
            )}

            <button
                onClick={() => router.push('/system/config')}
                className="mt-1 text-xs text-blue-600 hover:underline text-left"
            >
                Manage →
            </button>
        </div>
    );
}
