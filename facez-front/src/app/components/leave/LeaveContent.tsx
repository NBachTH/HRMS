"use client";
import React, { useState } from 'react'
import { LeaveTable } from "@/app/components/leave/LeaveTable";
import { LeaveFormModal } from "@/app/components/leave/LeaveFormModal";

export function LeaveContent() {
    const [showCreate, setShowCreate] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-600 mb-2">Absence Records</h1>
                    <p className="text-sm text-gray-400">Absent Application / Absence Record</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    New Request
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Absence records</h2>
                </div>
                <LeaveTable refreshKey={refreshKey} />
            </div>

            <LeaveFormModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={() => setRefreshKey(k => k + 1)}
            />
        </div>
    )
}
