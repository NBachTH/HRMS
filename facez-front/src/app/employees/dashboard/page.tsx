"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { DashboardContent } from '../../components/dashboard/DashboardContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <DashboardContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
