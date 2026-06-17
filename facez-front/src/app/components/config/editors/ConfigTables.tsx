"use client";

import React from 'react';

/** Simple 2-column label/value table — shared by detail views (and editors via input cells). */
export function KVTable({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
    return (
        <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                    <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}>
                        <td className="px-3 py-2 text-gray-500 w-1/2 align-top">{r.label}</td>
                        <td className="px-3 py-2 text-gray-900 font-medium">{r.value ?? '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Simple header + rows grid — shared by detail views (text cells) and editors (input cells). */
export function GridTable({ headers, rows }: { headers: React.ReactNode[]; rows: React.ReactNode[][] }) {
    return (
        <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-gray-50">
                <tr>
                    {headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 ? 'bg-gray-50/50' : ''}>
                        {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 text-gray-800">{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">{title}</p>
            {children}
        </div>
    );
}

/** Fraction (0.08) → percent string ("8%"). */
export const pct = (f: number) => `${(Math.round(f * 1e7) / 1e5)}%`;
