"use client";

import React, { useState } from 'react'
import { EmployeeTable } from './EmployeeTable'
import { EmployeeFormModal } from './EmployeeFormModal'
import { useAuth } from '@/app/commons/contexts/AuthContext'

export function EmployeeContent() {
    const { role } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const canWrite = role === 'HR_ADMIN'

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">Employee</h1>
                    <p className="text-sm text-gray-500">HR / Employee</p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Add Employee
                    </button>
                )}
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Current Employees</h2>
                    <div className="w-64">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <EmployeeTable searchTerm={searchTerm} refreshKey={refreshKey} canWrite={canWrite} />
            </div>

            {canWrite && (
                <EmployeeFormModal
                    isOpen={showCreate}
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => setRefreshKey(k => k + 1)}
                    employee={null}
                />
            )}
        </div>
    )
}
