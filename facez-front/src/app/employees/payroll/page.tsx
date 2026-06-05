"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { PayslipContent } from '@/app/components/payroll/PayslipContent';

export default function PayslipPage() {
    return (
        <ProtectedRoute>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <PayslipContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
