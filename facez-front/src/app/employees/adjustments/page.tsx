"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { MyAdjustmentsContent } from '@/app/components/attendance/MyAdjustmentsContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function MyAdjustmentsPage() {
    return (
        <ProtectedRoute>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <MyAdjustmentsContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
