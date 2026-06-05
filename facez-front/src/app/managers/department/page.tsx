"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { DepartmentContent } from '../../components/department/DepartmentContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function DepartmentPage() {
    return (
        <ProtectedRoute allowedRoles={['MANAGER', 'LEADER', 'HR_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <DepartmentContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
