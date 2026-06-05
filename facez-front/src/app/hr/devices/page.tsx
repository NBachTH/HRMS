"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { DeviceContent } from '@/app/components/device/DeviceContent';

export default function DevicesPage() {
    return (
        <ProtectedRoute allowedRoles={['HR_ADMIN', 'SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <DeviceContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
