"use client";
import React from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { Header } from '@/app/components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { ReportsContent } from '@/app/components/finance/ReportsContent';

export default function ReportsPage() {
    return (
        <ProtectedRoute allowedRoles={['FINANCE_ADMIN', 'DIRECTOR', 'HR_ADMIN', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <ReportsContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
