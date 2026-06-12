"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { MyTimesheetContent } from '@/app/components/timesheet/MyTimesheetContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function MyTimesheetPage() {
    return (
        <ProtectedRoute>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <MyTimesheetContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
