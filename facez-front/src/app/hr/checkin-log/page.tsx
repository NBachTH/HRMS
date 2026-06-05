"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { CheckinLogContent } from '@/app/components/attendance/CheckinLogContent';

export default function CheckinLogPage() {
    return (
        <ProtectedRoute allowedRoles={['HR_ADMIN', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <CheckinLogContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
