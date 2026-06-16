"use client";

import React, { useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type {
    AllowanceConfig, AllowanceConfigRequest, AllowanceLivingLevel, AllowanceJpLevel,
} from '@/app/commons/types';
import { Field, DateInput, TextInput, NumberInput, Toggle, CsvInput, FormButtons } from './fields';

interface Props {
    initial?: AllowanceConfig | null;
    saving: boolean;
    onSave: (req: AllowanceConfigRequest) => void;
    onCancel: () => void;
}

const blankLevel = (): AllowanceLivingLevel => ({ levelKey: '', meal: 0, phone: 0, transport: 0, housing: 0 });
const blankJp = (): AllowanceJpLevel => ({ jlptLevel: '', amount: 0 });

export function AllowanceEditor({ initial, saving, onSave, onCancel }: Props) {
    const [effectiveFrom, setEffectiveFrom] = useState(initial?.effectiveFrom ?? '');
    const [legalBasis, setLegalBasis] = useState(initial?.legalBasis ?? '');
    const [livingProrated, setLivingProrated] = useState(initial?.livingProrated ?? true);
    const [japaneseProrated, setJapaneseProrated] = useState(initial?.japaneseProrated ?? false);
    const [jpMinMonths, setJpMinMonths] = useState<number | null>(initial?.japaneseMinContractMonths ?? null);
    const [levels, setLevels] = useState<AllowanceLivingLevel[]>(initial?.levels?.length ? initial.levels : [blankLevel()]);
    const [jpLevels, setJpLevels] = useState<AllowanceJpLevel[]>(initial?.japaneseLevels ?? []);
    const [livingEligible, setLivingEligible] = useState<string[]>(initial?.livingEligibleContracts ?? []);
    const [jpEligible, setJpEligible] = useState<string[]>(initial?.japaneseEligibleContracts ?? []);
    const [jpExclPos, setJpExclPos] = useState<string[]>(initial?.japaneseExcludedPositions ?? []);
    const [jpExclLvl, setJpExclLvl] = useState<string[]>(initial?.japaneseExcludedLevels ?? []);
    const [error, setError] = useState<string | null>(null);

    const setLevel = (i: number, patch: Partial<AllowanceLivingLevel>) =>
        setLevels(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const setJp = (i: number, patch: Partial<AllowanceJpLevel>) =>
        setJpLevels(js => js.map((j, idx) => idx === i ? { ...j, ...patch } : j));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!effectiveFrom) { setError('Effective date is required.'); return; }
        const cleanLevels = levels.filter(l => l.levelKey.trim());
        if (cleanLevels.length === 0) { setError('At least one living-allowance level is required.'); return; }
        const cleanJp = jpLevels.filter(j => j.jlptLevel.trim());
        onSave({
            effectiveFrom, legalBasis: legalBasis || undefined,
            livingProrated, japaneseProrated, japaneseMinContractMonths: jpMinMonths,
            levels: cleanLevels, japaneseLevels: cleanJp,
            livingEligibleContracts: livingEligible,
            japaneseEligibleContracts: jpEligible,
            japaneseExcludedPositions: jpExclPos,
            japaneseExcludedLevels: jpExclLvl,
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Field label="Effective from" required><DateInput value={effectiveFrom} onChange={setEffectiveFrom} /></Field>
                <Field label="Legal basis"><TextInput value={legalBasis} onChange={setLegalBasis} /></Field>
            </div>

            {/* Living allowance matrix */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Living allowance (VND/month)</p>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-400">
                            <th className="py-1 pr-2">Level key</th>
                            <th className="py-1 pr-2">Meal</th>
                            <th className="py-1 pr-2">Phone</th>
                            <th className="py-1 pr-2">Transport</th>
                            <th className="py-1 pr-2">Housing</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {levels.map((l, i) => (
                            <tr key={i}>
                                <td className="py-1 pr-2"><TextInput value={l.levelKey} onChange={v => setLevel(i, { levelKey: v })} placeholder="DIRECTOR" /></td>
                                <td className="py-1 pr-2"><NumberInput value={l.meal} onChange={v => setLevel(i, { meal: v ?? 0 })} /></td>
                                <td className="py-1 pr-2"><NumberInput value={l.phone} onChange={v => setLevel(i, { phone: v ?? 0 })} /></td>
                                <td className="py-1 pr-2"><NumberInput value={l.transport} onChange={v => setLevel(i, { transport: v ?? 0 })} /></td>
                                <td className="py-1 pr-2"><NumberInput value={l.housing} onChange={v => setLevel(i, { housing: v ?? 0 })} /></td>
                                <td className="py-1">
                                    <button type="button" onClick={() => setLevels(ls => ls.filter((_, idx) => idx !== i))}
                                        className="p-1 text-gray-400 hover:text-red-600" title="Remove"><Trash2Icon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button type="button" onClick={() => setLevels(ls => [...ls, blankLevel()])}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    <PlusIcon className="w-3.5 h-3.5" /> Add level
                </button>
                <div className="mt-2"><Toggle label="Living allowance prorated by working days" checked={livingProrated} onChange={setLivingProrated} /></div>
            </div>

            {/* Japanese allowance */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Japanese language allowance (VND/month)</p>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-400">
                            <th className="py-1 pr-2">JLPT level</th>
                            <th className="py-1 pr-2">Amount</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {jpLevels.map((j, i) => (
                            <tr key={i}>
                                <td className="py-1 pr-2"><TextInput value={j.jlptLevel} onChange={v => setJp(i, { jlptLevel: v })} placeholder="N1" /></td>
                                <td className="py-1 pr-2"><NumberInput value={j.amount} onChange={v => setJp(i, { amount: v ?? 0 })} /></td>
                                <td className="py-1">
                                    <button type="button" onClick={() => setJpLevels(js => js.filter((_, idx) => idx !== i))}
                                        className="p-1 text-gray-400 hover:text-red-600" title="Remove"><Trash2Icon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button type="button" onClick={() => setJpLevels(js => [...js, blankJp()])}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    <PlusIcon className="w-3.5 h-3.5" /> Add JLPT level
                </button>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <Field label="Min contract months (Japanese)"><NumberInput value={jpMinMonths} onChange={setJpMinMonths} /></Field>
                    <div className="pt-7"><Toggle label="Japanese allowance prorated" checked={japaneseProrated} onChange={setJapaneseProrated} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <Field label="Living eligible contracts"><CsvInput value={livingEligible} onChange={setLivingEligible} placeholder="PROBATION, FIXED_TERM, INDEFINITE" /></Field>
                    <Field label="Japanese eligible contracts"><CsvInput value={jpEligible} onChange={setJpEligible} placeholder="FIXED_TERM, INDEFINITE" /></Field>
                    <Field label="Japanese excluded positions"><CsvInput value={jpExclPos} onChange={setJpExclPos} /></Field>
                    <Field label="Japanese excluded levels"><CsvInput value={jpExclLvl} onChange={setJpExclLvl} /></Field>
                </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <FormButtons saving={saving} onCancel={onCancel} />
        </form>
    );
}
