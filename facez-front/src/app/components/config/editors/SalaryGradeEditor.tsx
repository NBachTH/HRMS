"use client";

import React, { useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { SalaryGradeConfig, SalaryGradeConfigRequest, SalaryGradeItem } from '@/app/commons/types';
import { Field, DateInput, TextInput, NumberInput, FormButtons } from './fields';

interface Props {
    initial?: SalaryGradeConfig | null;
    saving: boolean;
    onSave: (req: SalaryGradeConfigRequest) => void;
    onCancel: () => void;
}

const STEP_COUNT = 10;

interface GradeRow { gradeCode: string; title: string; track: string; steps: (number | null)[]; }

const blankGrade = (): GradeRow => ({ gradeCode: '', title: '', track: '', steps: Array(STEP_COUNT).fill(null) });

export function SalaryGradeEditor({ initial, saving, onSave, onCancel }: Props) {
    const [effectiveFrom, setEffectiveFrom] = useState(initial?.effectiveFrom ?? '');
    const [legalBasis, setLegalBasis] = useState(initial?.legalBasis ?? '');
    const [minWage, setMinWage] = useState<number | null>(initial?.minimumWageRegionI ?? null);
    const [grades, setGrades] = useState<GradeRow[]>(
        initial?.grades.map(g => ({
            gradeCode: g.gradeCode, title: g.title ?? '', track: g.track ?? '',
            steps: Array.from({ length: STEP_COUNT }, (_, i) => g.steps[i] ?? null),
        })) ?? [blankGrade()]
    );
    const [error, setError] = useState<string | null>(null);

    const setGrade = (i: number, patch: Partial<GradeRow>) =>
        setGrades(gs => gs.map((g, idx) => idx === i ? { ...g, ...patch } : g));
    const setStep = (gi: number, si: number, v: number | null) =>
        setGrades(gs => gs.map((g, idx) => idx === gi ? { ...g, steps: g.steps.map((s, j) => j === si ? v : s) } : g));
    const addGrade = () => setGrades(gs => [...gs, blankGrade()]);
    const removeGrade = (i: number) => setGrades(gs => gs.filter((_, idx) => idx !== i));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!effectiveFrom) { setError('Effective date is required.'); return; }
        const out: SalaryGradeItem[] = [];
        for (const g of grades) {
            if (!g.gradeCode.trim()) { setError('Every grade needs a code.'); return; }
            // Trailing empty steps are allowed; collect leading contiguous steps.
            const steps = g.steps.filter(s => s !== null) as number[];
            if (steps.length === 0) { setError(`Grade ${g.gradeCode}: at least one step amount is required.`); return; }
            out.push({ gradeCode: g.gradeCode.trim(), title: g.title || undefined, track: g.track || undefined, steps });
        }
        if (out.length === 0) { setError('At least one grade is required.'); return; }
        onSave({ effectiveFrom, legalBasis: legalBasis || undefined, unit: 'thousand_vnd', minimumWageRegionI: minWage, grades: out });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <Field label="Effective from" required><DateInput value={effectiveFrom} onChange={setEffectiveFrom} /></Field>
                <Field label="Legal basis"><TextInput value={legalBasis} onChange={setLegalBasis} /></Field>
                <Field label="Min wage region I (thousand VND)"><NumberInput value={minWage} onChange={setMinWage} /></Field>
            </div>

            <p className="text-xs text-gray-400">Amounts are in <strong>thousand VND</strong> (e.g. 12000 = 12,000,000₫). Leave trailing steps blank if a grade has fewer than 10.</p>

            <div className="space-y-3">
                {grades.map((g, gi) => (
                    <div key={gi} className="border border-gray-200 rounded-md p-3">
                        <div className="grid grid-cols-12 gap-2 mb-2 items-end">
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Code</label>
                                <TextInput value={g.gradeCode} onChange={v => setGrade(gi, { gradeCode: v })} placeholder="NV1" />
                            </div>
                            <div className="col-span-5">
                                <label className="block text-xs text-gray-500 mb-1">Title</label>
                                <TextInput value={g.title} onChange={v => setGrade(gi, { title: v })} />
                            </div>
                            <div className="col-span-4">
                                <label className="block text-xs text-gray-500 mb-1">Track</label>
                                <TextInput value={g.track} onChange={v => setGrade(gi, { track: v })} placeholder="employee / management" />
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <button type="button" onClick={() => removeGrade(gi)}
                                    className="p-2 text-gray-400 hover:text-red-600" title="Remove grade">
                                    <Trash2Icon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                            {g.steps.map((s, si) => (
                                <div key={si}>
                                    <label className="block text-[10px] text-gray-400 text-center">S{si + 1}</label>
                                    <NumberInput value={s} onChange={v => setStep(gi, si, v)} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addGrade}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    <PlusIcon className="w-3.5 h-3.5" /> Add grade
                </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <FormButtons saving={saving} onCancel={onCancel} />
        </form>
    );
}
