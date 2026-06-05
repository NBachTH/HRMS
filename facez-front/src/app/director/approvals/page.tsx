"use client";
import React from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { Header } from '@/app/components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { DirectorApprovalContent } from '@/app/components/director/DirectorApprovalContent';

export default function DirectorApprovalsPage() {
    return (
        <ProtectedRoute allowedRoles={['DIRECTOR', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <DirectorApprovalContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
