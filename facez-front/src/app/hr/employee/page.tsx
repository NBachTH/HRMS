"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { EmployeeContent } from '@/app/components/employee/EmployeeContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function Page() {
    return (
        <ProtectedRoute allowedRoles={['HR_ADMIN', 'LEADER', 'MANAGER', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <EmployeeContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
