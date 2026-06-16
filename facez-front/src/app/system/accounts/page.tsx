"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { AccountManagerContent } from '@/app/components/system/AccountManagerContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function AccountManagerPage() {
    return (
        <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <AccountManagerContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
