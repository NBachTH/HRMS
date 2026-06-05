"use client";
import React from 'react'
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
} from 'recharts'
export function AttendanceRadarChart() {
    const data = [
        {
            subject: 'Sales',
            allocated: 120,
            actual: 110,
        },
        {
            subject: 'Marketing',
            allocated: 98,
            actual: 130,
        },
        {
            subject: 'Development',
            allocated: 86,
            actual: 130,
        },
        {
            subject: 'Customer Support',
            allocated: 99,
            actual: 100,
        },
        {
            subject: 'Information Technology',
            allocated: 85,
            actual: 90,
        },
        {
            subject: 'Administration',
            allocated: 65,
            actual: 85,
        },
    ]
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-blue-600 font-semibold">Attendance Report</h3>
                <span className="text-gray-400 text-sm">| This Month</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={data}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{
                            fontSize: 10,
                        }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 150]} tick={false} />
                    <Radar
                        name="Allocated Budget"
                        dataKey="allocated"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.3}
                    />
                    <Radar
                        name="Actual Spending"
                        dataKey="actual"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                    />
                    <Legend
                        wrapperStyle={{
                            fontSize: '12px',
                        }}
                        iconType="square"
                        iconSize={10}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}
