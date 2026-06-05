"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { ContractContent } from '@/app/components/contract/ContractContent';

export default function ContractPage() {
    return (
        <ProtectedRoute allowedRoles={['HR_ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <ContractContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
