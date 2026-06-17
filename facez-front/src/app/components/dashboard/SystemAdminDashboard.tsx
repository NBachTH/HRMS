"use client";
import React from 'react';
import { EmployeeDashboard } from './EmployeeDashboard';

// Payroll configuration is owned by Finance (see /finance/config). System admin no longer
// surfaces config here; this dashboard simply reuses the standard sections.
export function SystemAdminDashboard() {
    return <EmployeeDashboard />;
}
