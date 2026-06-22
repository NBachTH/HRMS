"use client";
import React, { useState } from 'react'
import { LeaveTable } from "@/app/components/leave/LeaveTable";
import { LeaveFormModal } from "@/app/components/leave/LeaveFormModal";
import type { LeaveRequest } from '@/app/commons/types';

export function LeaveContent() {
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<LeaveRequest | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-700 mb-2">My Leaves</h1>
                    <p className="text-sm text-gray-500">Đơn xin nghỉ của bạn</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    New Request
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                    <h2 className="text-xl font-semibold text-gray-800">Absence records</h2>
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-gray-600">Từ</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded-md text-gray-800" />
                        <label className="text-gray-600">đến</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded-md text-gray-800" />
                        {(from || to) && (
                            <button onClick={() => { setFrom(''); setTo(''); }}
                                className="px-2 py-1 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Xóa lọc</button>
                        )}
                    </div>
                </div>
                <LeaveTable refreshKey={refreshKey} from={from} to={to} onEdit={setEditing} />
            </div>

            <LeaveFormModal
                isOpen={showCreate || !!editing}
                editing={editing}
                onClose={() => { setShowCreate(false); setEditing(null); }}
                onSuccess={() => setRefreshKey(k => k + 1)}
            />
        </div>
    )
}
