"use client";
import React from 'react';
import { Sidebar } from '../../../components/Sidebar';
import { Header } from '../../../components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { PayrollDetailContent } from '@/app/components/payroll/PayrollDetailContent';
import { use } from 'react';

export default function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <ProtectedRoute allowedRoles={['FINANCE_ADMIN', 'DIRECTOR', 'HR_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <PayrollDetailContent payrollId={id} />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
