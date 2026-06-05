"use client";
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ProtectedRoute } from '@/app/commons/utils/Protector';
import { NotificationContent } from '@/app/components/notification/NotificationContent';

export default function NotificationsPage() {
    return (
        <ProtectedRoute>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <NotificationContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
