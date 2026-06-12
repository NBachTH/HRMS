"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { OTPlanContent } from '@/app/components/ot/OTPlanContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function OTPlanPage() {
    return (
        <ProtectedRoute allowedRoles={['LEADER', 'MANAGER', 'HR_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <OTPlanContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
