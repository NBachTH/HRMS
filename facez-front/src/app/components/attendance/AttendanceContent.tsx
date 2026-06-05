"use client";

import React, { useEffect, useState } from 'react';
import AttendanceTable from './AttendanceTable';
import { getMyProfile } from '@/app/services/EmployeeService';

function firstDayOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AttendanceContent() {
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [fromInput, setFromInput] = useState(firstDayOfMonth());
    const [toInput, setToInput] = useState(today());
    const [applied, setApplied] = useState({ from: firstDayOfMonth(), to: today() });

    useEffect(() => {
        getMyProfile()
            .then(res => { if (res.success) setEmployeeId(res.data.employeeId); })
            .catch(() => {});
    }, []);

    const handleFilter = () => {
        setApplied({ from: fromInput, to: toInput });
    };

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-1">My Attendance</h1>
                <p className="text-sm text-gray-500">Personal / Attendance</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                        <input
                            type="date"
                            value={fromInput}
                            onChange={e => setFromInput(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <input
                            type="date"
                            value={toInput}
                            onChange={e => setToInput(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleFilter}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Attendance Records</h2>
                </div>
                {employeeId
                    ? <AttendanceTable employeeId={employeeId} from={applied.from} to={applied.to} />
                    : <div className="p-6 text-center text-gray-500">Loading...</div>
                }
            </div>
        </div>
    );
}
