"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Kpi1Content } from '@/app/components/kpi/Kpi1Content';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function Kpi1Page() {
    return (
        <ProtectedRoute allowedRoles={['MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <Kpi1Content />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
