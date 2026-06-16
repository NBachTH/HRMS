"use client";

import React from 'react';

const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

export function Field({ label, required, hint, children }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{required && <span className="text-red-500"> *</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
    );
}

export function TextInput({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
}) {
    return (
        <input type="text" value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)} className={inputCls} />
    );
}

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void; }) {
    return <input type="date" value={value} onChange={e => onChange(e.target.value)} className={inputCls} />;
}

/** Number field that keeps an empty string while editing; emits null when blank. */
export function NumberInput({ value, onChange, placeholder, step }: {
    value: number | null; onChange: (v: number | null) => void; placeholder?: string; step?: string;
}) {
    return (
        <input
            type="number"
            step={step}
            value={value === null || value === undefined ? '' : value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className={inputCls}
        />
    );
}

export function Toggle({ checked, onChange, label }: {
    checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
    return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {label}
        </label>
    );
}

/** Comma-separated string list editor. */
export function CsvInput({ value, onChange, placeholder }: {
    value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
    return (
        <input
            type="text"
            value={value.join(', ')}
            placeholder={placeholder ?? 'comma, separated, values'}
            onChange={e => onChange(
                e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            )}
            className={inputCls}
        />
    );
}

export function FormButtons({ saving, onCancel, submitLabel = 'Save draft' }: {
    saving: boolean; onCancel: () => void; submitLabel?: string;
}) {
    return (
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                Cancel
            </button>
            <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : submitLabel}
            </button>
        </div>
    );
}

export const CONTRACT_TYPES = ['PROBATION', 'FIXED_TERM', 'INDEFINITE'];
