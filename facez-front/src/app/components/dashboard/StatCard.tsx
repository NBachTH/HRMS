import React from 'react'
import { TrendingUpIcon } from 'lucide-react'
interface StatCardProps {
    title: string
    subtitle: string
    value: number
    percentChange: number
    isIncrease: boolean
}
export function StatCard({
                             title,
                             subtitle,
                             value,
                             percentChange,
                             isIncrease,
                         }: StatCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-blue-600 font-semibold">{title}</h3>
                <span className="text-gray-400 text-sm">| {subtitle}</span>
            </div>
            <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-gray-800">{value}</p>
                <div className="flex items-center text-green-600 text-sm">
                    <TrendingUpIcon className="w-4 h-4 mr-1" />
                    <span>{percentChange}% increase</span>
                </div>
            </div>
        </div>
    )
}
