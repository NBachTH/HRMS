"use client";
import React from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
export function ReportsChart() {
    const data = [
        {
            time: '00:00',
            series1: 30,
            series2: 15,
            series3: 20,
        },
        {
            time: '01:00',
            series1: 40,
            series2: 25,
            series3: 15,
        },
        {
            time: '02:00',
            series1: 35,
            series2: 30,
            series3: 28,
        },
        {
            time: '03:00',
            series1: 50,
            series2: 45,
            series3: 32,
        },
        {
            time: '04:00',
            series1: 45,
            series2: 30,
            series3: 22,
        },
        {
            time: '05:00',
            series1: 40,
            series2: 35,
            series3: 12,
        },
        {
            time: '06:00',
            series1: 80,
            series2: 52,
            series3: 25,
        },
    ]
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-blue-600 font-semibold text-lg">Reports</h2>
                <span className="text-gray-400 text-sm">| Today</span>
            </div>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="time" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="series1"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{
                            fill: '#6366f1',
                            r: 4,
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="series2"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{
                            fill: '#10b981',
                            r: 4,
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="series3"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{
                            fill: '#f59e0b',
                            r: 4,
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
