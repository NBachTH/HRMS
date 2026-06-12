"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { TimesheetContent } from '@/app/components/timesheet/TimesheetContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function TimesheetPage() {
    return (
        <ProtectedRoute allowedRoles={['HR_ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'DIRECTOR', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <TimesheetContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
