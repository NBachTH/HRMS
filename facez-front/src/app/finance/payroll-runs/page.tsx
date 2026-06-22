"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { PayrollRunContent } from '@/app/components/payroll/PayrollRunContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function PayrollRunsPage() {
    return (
        <ProtectedRoute allowedRoles={['FINANCE_ADMIN', 'DIRECTOR', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <PayrollRunContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
