"use client";

import React, { use } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { Header } from '@/app/components/Header';
import { DepartmentDetailContent } from '@/app/components/department/DepartmentDetailContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

export default function ManagerDepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <ProtectedRoute allowedRoles={['MANAGER', 'LEADER', 'HR_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <DepartmentDetailContent departmentId={id} />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
