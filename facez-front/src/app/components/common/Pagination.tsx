"use client";
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface Props {
    page: number;           // 0-indexed
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
    if (totalPages <= 1) return null;

    const pages: (number | '…')[] = [];
    if (totalPages <= 7) {
        for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
        pages.push(0);
        if (page > 2) pages.push('…');
        for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
        if (page < totalPages - 3) pages.push('…');
        pages.push(totalPages - 1);
    }

    return (
        <div className="flex items-center justify-center gap-1 mt-4">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
                className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
            </button>
            {pages.map((p, i) =>
                p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`min-w-[32px] h-8 px-2 text-sm rounded-md transition-colors ${
                            p === page
                                ? 'bg-blue-600 text-white font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {(p as number) + 1}
                    </button>
                )
            )}
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            </button>
        </div>
    );
}
