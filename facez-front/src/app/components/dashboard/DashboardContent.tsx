"use client";
import React from 'react';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { EmployeeDashboard } from './EmployeeDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { HrDashboard } from './HrDashboard';
import { SystemAdminDashboard } from './SystemAdminDashboard';

export function DashboardContent() {
    const { role, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    switch (role) {
        case 'SYSTEM_ADMIN':
            return <SystemAdminDashboard />;
        case 'HR_ADMIN':
            return <HrDashboard />;
        case 'MANAGER':
        case 'LEADER':
            return <ManagerDashboard />;
        default:
            return <EmployeeDashboard />;
    }
}
