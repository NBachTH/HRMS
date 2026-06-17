"use client";

import React, { useState } from 'react';
import type { InsuranceConfig, InsuranceConfigRequest } from '@/app/commons/types';
import { Field, DateInput, TextInput, NumberInput, Toggle, FormButtons, CONTRACT_TYPES } from './fields';

interface Props {
    initial?: InsuranceConfig | null;
    saving: boolean;
    onSave: (req: InsuranceConfigRequest) => void;
    onCancel: () => void;
}

// Rates are stored as fractions (0.08) but edited as percent (8).
const toPct = (f: number | null | undefined) => (f === null || f === undefined ? null : Math.round(f * 1e7) / 1e5);
const toFrac = (p: number | null) => (p === null ? 0 : Math.round((p / 100) * 1e7) / 1e7);

/** One labelled percent-input row inside a rate table. */
function RateRow({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
    return (
        <tr className="border-t border-gray-100">
            <td className="px-3 py-1.5 text-gray-600">{label}</td>
            <td className="px-3 py-1.5 w-32"><NumberInput value={value} onChange={onChange} step="0.001" /></td>
        </tr>
    );
}

export function InsuranceEditor({ initial, saving, onSave, onCancel }: Props) {
    const [effectiveFrom, setEffectiveFrom] = useState(initial?.effectiveFrom ?? '');
    const [legalBasis, setLegalBasis] = useState(initial?.legalBasis ?? '');
    const [govBase, setGovBase] = useState<number | null>(initial?.governmentBaseSalary ?? null);
    const [ceiling, setCeiling] = useState<number | null>(initial?.insuranceCeiling ?? null);
    const [minWage, setMinWage] = useState<number | null>(initial?.statutoryMinWage ?? null);

    const [eeBhxh, setEeBhxh] = useState<number | null>(toPct(initial?.eeBhxh) ?? 8);
    const [eeBhyt, setEeBhyt] = useState<number | null>(toPct(initial?.eeBhyt) ?? 1.5);
    const [eeBhtn, setEeBhtn] = useState<number | null>(toPct(initial?.eeBhtn) ?? 1);
    const [erPension, setErPension] = useState<number | null>(toPct(initial?.erBhxhPension) ?? 14);
    const [erSick, setErSick] = useState<number | null>(toPct(initial?.erBhxhSicknessMaternity) ?? 3);
    const [erAcc, setErAcc] = useState<number | null>(toPct(initial?.erBhxhAccident) ?? 0.5);
    const [erBhyt, setErBhyt] = useState<number | null>(toPct(initial?.erBhyt) ?? 3);
    const [erBhtn, setErBhtn] = useState<number | null>(toPct(initial?.erBhtn) ?? 1);

    const [probationExempt, setProbationExempt] = useState(initial?.probationExempt ?? true);
    const [eligible, setEligible] = useState<string[]>(initial?.eligibleContractTypes ?? ['FIXED_TERM', 'INDEFINITE']);

    const eeTotal = (eeBhxh ?? 0) + (eeBhyt ?? 0) + (eeBhtn ?? 0);
    const erTotal = (erPension ?? 0) + (erSick ?? 0) + (erAcc ?? 0) + (erBhyt ?? 0) + (erBhtn ?? 0);

    const toggleEligible = (ct: string) =>
        setEligible(prev => prev.includes(ct) ? prev.filter(x => x !== ct) : [...prev, ct]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!effectiveFrom) return;
        onSave({
            effectiveFrom,
            legalBasis: legalBasis || undefined,
            governmentBaseSalary: govBase,
            insuranceCeiling: ceiling,
            statutoryMinWage: minWage,
            eeBhxh: toFrac(eeBhxh), eeBhyt: toFrac(eeBhyt), eeBhtn: toFrac(eeBhtn),
            erBhxhPension: toFrac(erPension), erBhxhSicknessMaternity: toFrac(erSick),
            erBhxhAccident: toFrac(erAcc), erBhyt: toFrac(erBhyt), erBhtn: toFrac(erBhtn),
            probationExempt,
            eligibleContractTypes: eligible,
        });
    };

    const tableCls = "w-full text-sm border border-gray-200 rounded-md overflow-hidden";

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Field label="Effective from" required><DateInput value={effectiveFrom} onChange={setEffectiveFrom} /></Field>
                <Field label="Legal basis"><TextInput value={legalBasis} onChange={setLegalBasis} placeholder="e.g. Law 41/2024/QH15" /></Field>
                <Field label="Government base salary (VND)"><NumberInput value={govBase} onChange={setGovBase} /></Field>
                <Field label="Insurance ceiling (VND)"><NumberInput value={ceiling} onChange={setCeiling} /></Field>
                <Field label="Statutory min wage (VND)" hint="BHXH cap = 20×; blank → default 2,340,000"><NumberInput value={minWage} onChange={setMinWage} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Employee rates (%) — Σ {eeTotal.toFixed(3)}%</p>
                    <table className={tableCls}><tbody>
                        <RateRow label="BHXH" value={eeBhxh} onChange={setEeBhxh} />
                        <RateRow label="BHYT" value={eeBhyt} onChange={setEeBhyt} />
                        <RateRow label="BHTN" value={eeBhtn} onChange={setEeBhtn} />
                    </tbody></table>
                </div>
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Employer rates (%) — Σ {erTotal.toFixed(3)}%</p>
                    <table className={tableCls}><tbody>
                        <RateRow label="BHXH pension" value={erPension} onChange={setErPension} />
                        <RateRow label="BHXH sickness/maternity" value={erSick} onChange={setErSick} />
                        <RateRow label="BHXH accident" value={erAcc} onChange={setErAcc} />
                        <RateRow label="BHYT" value={erBhyt} onChange={setErBhyt} />
                        <RateRow label="BHTN" value={erBhtn} onChange={setErBhtn} />
                    </tbody></table>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
                <Field label="Eligible contract types">
                    <div className="flex flex-wrap gap-3 pt-1">
                        {CONTRACT_TYPES.map(ct => (
                            <Toggle key={ct} label={ct} checked={eligible.includes(ct)} onChange={() => toggleEligible(ct)} />
                        ))}
                    </div>
                </Field>
                <Field label="Probation">
                    <div className="pt-1"><Toggle label="Probation exempt from insurance" checked={probationExempt} onChange={setProbationExempt} /></div>
                </Field>
            </div>

            <FormButtons saving={saving} onCancel={onCancel} />
        </form>
    );
}
