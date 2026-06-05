"use client";
import React, { useEffect, useState } from 'react';
import { getEmployees } from '@/app/services/EmployeeService';
import { getPayrollsByPeriod } from '@/app/services/PayrollService';
import { getContracts } from '@/app/services/ContractService';
import { getSystemConfigs } from '@/app/services/SystemConfigService';
import { ActiveConfigCard } from './ActiveConfigCard';
import { EmployeeDashboard } from './EmployeeDashboard';
import type { SystemConfig, ConfigType, Contract } from '@/app/commons/types';

const CONFIG_TYPES: ConfigType[] = ['SALARY_GRADE', 'ALLOWANCE', 'PIT', 'INSURANCE'];

export function SystemAdminDashboard() {
    const [activeConfigs, setActiveConfigs] = useState<Record<ConfigType, SystemConfig | null>>({
        SALARY_GRADE: null,
        ALLOWANCE: null,
        PIT: null,
        INSURANCE: null,
    });
    const [configLoading, setConfigLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setConfigLoading(true);
            const results = await Promise.allSettled(
                CONFIG_TYPES.map(type => getSystemConfigs(type))
            );
            const map = { ...activeConfigs };
            results.forEach((result, i) => {
                const type = CONFIG_TYPES[i];
                if (result.status === 'fulfilled' && result.value.success) {
                    map[type] = (result.value.data as SystemConfig[]).find(c => c.active) ?? null;
                } else {
                    map[type] = null;
                }
            });
            setActiveConfigs(map);
            setConfigLoading(false);
        };
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const hasWarning = !configLoading && CONFIG_TYPES.some(t => activeConfigs[t] === null);

    return (
        <div>
            {/* Inherit all HR sections */}
            <EmployeeDashboard />

            {/* System config section */}
            <div className="px-8 pb-8 space-y-4">
                <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-800">Payroll Config — Active Versions</h2>
                        {hasWarning && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                ⚠ Config missing
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                        These versions are loaded by the payroll engine on every calculation run.
                    </p>
                </div>

                {configLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {CONFIG_TYPES.map(t => (
                            <div key={t} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse h-32" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {CONFIG_TYPES.map(type => (
                            <ActiveConfigCard key={type} configType={type} config={activeConfigs[type]} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
