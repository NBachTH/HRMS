"use client";
import React from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { Header } from '@/app/components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { FinancePayrollContent } from '@/app/components/finance/FinancePayrollContent';

export default function FinancePayrollPage() {
    return (
        <ProtectedRoute allowedRoles={['FINANCE_ADMIN', 'DIRECTOR', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <FinancePayrollContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
