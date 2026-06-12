"use client";
import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { EmployeeContent } from '@/app/components/employee/EmployeeContent';
import { ProtectedRoute } from '@/app/commons/utils/Protector';

// Đợt 3 sẽ thay bằng trang quản lý tài khoản chuyên biệt (username/role/enable/reset password).
export default function AccountManagerPage() {
    return (
        <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
            <div className="flex h-screen w-full bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto">
                        <EmployeeContent />
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
