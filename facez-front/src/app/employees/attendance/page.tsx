"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { AttendanceContent } from '@/app/components/attendance/AttendanceContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function AttendancePage() {
    return (
        <ProtectedRoute>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <AttendanceContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
