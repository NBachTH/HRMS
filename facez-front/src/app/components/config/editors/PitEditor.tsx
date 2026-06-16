"use client";

import React, { useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { PitConfig, PitConfigRequest, PitBracketItem } from '@/app/commons/types';
import { Field, DateInput, TextInput, NumberInput, FormButtons } from './fields';

interface Props {
    initial?: PitConfig | null;
    saving: boolean;
    onSave: (req: PitConfigRequest) => void;
    onCancel: () => void;
}

interface Row { incomeFrom: number | null; incomeTo: number | null; ratePct: number | null; quickDeduction: number | null; }

const blankRow: Row = { incomeFrom: null, incomeTo: null, ratePct: null, quickDeduction: 0 };

export function PitEditor({ initial, saving, onSave, onCancel }: Props) {
    const [effectiveFrom, setEffectiveFrom] = useState(initial?.effectiveFrom ?? '');
    const [legalBasis, setLegalBasis] = useState(initial?.legalBasis ?? '');
    const [resolution, setResolution] = useState(initial?.resolution ?? '');
    const [personalRelief, setPersonalRelief] = useState<number | null>(initial?.personalRelief ?? null);
    const [dependentRelief, setDependentRelief] = useState<number | null>(initial?.dependentRelief ?? null);
    const [rows, setRows] = useState<Row[]>(
        initial?.brackets.map(b => ({
            incomeFrom: b.incomeFrom, incomeTo: b.incomeTo,
            ratePct: Math.round(b.rate * 1e5) / 1e3, quickDeduction: b.quickDeduction,
        })) ?? [{ ...blankRow, incomeFrom: 0 }]
    );
    const [error, setError] = useState<string | null>(null);

    const setRow = (i: number, patch: Partial<Row>) =>
        setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
    const addRow = () => setRows(rs => [...rs, { ...blankRow }]);
    const removeRow = (i: number) => setRows(rs => rs.filter((_, idx) => idx !== i));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!effectiveFrom) { setError('Effective date is required.'); return; }
        if (personalRelief === null || dependentRelief === null) { setError('Reliefs are required.'); return; }
        // Validate brackets: ascending, contiguous-ish, rate present.
        const brackets: PitBracketItem[] = [];
        let prevFrom = -1;
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (r.incomeFrom === null || r.ratePct === null) { setError(`Bracket ${i + 1}: income from and rate are required.`); return; }
            if (r.incomeFrom <= prevFrom) { setError(`Bracket ${i + 1}: "from" must be greater than the previous bracket.`); return; }
            if (r.incomeTo !== null && r.incomeTo <= r.incomeFrom) { setError(`Bracket ${i + 1}: "to" must be greater than "from" (or empty for the top bracket).`); return; }
            prevFrom = r.incomeFrom;
            brackets.push({
                incomeFrom: r.incomeFrom, incomeTo: r.incomeTo,
                rate: Math.round((r.ratePct / 100) * 1e7) / 1e7,
                quickDeduction: r.quickDeduction ?? 0,
            });
        }
        if (brackets.length === 0) { setError('At least one bracket is required.'); return; }
        onSave({
            effectiveFrom, legalBasis: legalBasis || undefined, resolution: resolution || undefined,
            personalRelief, dependentRelief, brackets,
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Field label="Effective from" required><DateInput value={effectiveFrom} onChange={setEffectiveFrom} /></Field>
                <Field label="Legal basis"><TextInput value={legalBasis} onChange={setLegalBasis} placeholder="e.g. Law 109/2025/QH15" /></Field>
                <Field label="Resolution"><TextInput value={resolution} onChange={setResolution} /></Field>
                <div />
                <Field label="Personal relief (VND/month)" required><NumberInput value={personalRelief} onChange={setPersonalRelief} /></Field>
                <Field label="Dependent relief (VND/month)" required><NumberInput value={dependentRelief} onChange={setDependentRelief} /></Field>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Progressive brackets</p>
                    <button type="button" onClick={addRow}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                        <PlusIcon className="w-3.5 h-3.5" /> Add bracket
                    </button>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-400">
                            <th className="py-1 pr-2">From (VND)</th>
                            <th className="py-1 pr-2">To (VND, blank = ∞)</th>
                            <th className="py-1 pr-2">Rate (%)</th>
                            <th className="py-1 pr-2">Quick deduction</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i}>
                                <td className="py-1 pr-2"><NumberInput value={r.incomeFrom} onChange={v => setRow(i, { incomeFrom: v })} /></td>
                                <td className="py-1 pr-2"><NumberInput value={r.incomeTo} onChange={v => setRow(i, { incomeTo: v })} placeholder="∞" /></td>
                                <td className="py-1 pr-2"><NumberInput value={r.ratePct} onChange={v => setRow(i, { ratePct: v })} step="0.01" /></td>
                                <td className="py-1 pr-2"><NumberInput value={r.quickDeduction} onChange={v => setRow(i, { quickDeduction: v })} /></td>
                                <td className="py-1">
                                    <button type="button" onClick={() => removeRow(i)}
                                        className="p-1 text-gray-400 hover:text-red-600" title="Remove">
                                        <Trash2Icon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <FormButtons saving={saving} onCancel={onCancel} />
        </form>
    );
}
