"use client";
import React from 'react';

interface Props { size?: 'sm' | 'md' | 'lg'; }

export function Spinner({ size = 'md' }: Props) {
    const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
    return (
        <div className="flex items-center justify-center py-8">
            <div className={`${sz} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="animate-pulse">
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 px-6 py-3 border-b border-gray-100">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className="h-4 bg-gray-200 rounded flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}
