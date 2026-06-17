"use client";

import React from 'react';
import type {
    ConfigType,
    SalaryGradeConfig, PitConfig, InsuranceConfig, AllowanceConfig,
} from '@/app/commons/types';
import { formatVnd } from '@/app/commons/utils/formatters';
import { KVTable, GridTable, Section, pct } from './ConfigTables';

type AnyConfig = SalaryGradeConfig | PitConfig | InsuranceConfig | AllowanceConfig;

/** Read-only detail of one config version, rendered as simple tables (shared look with editors). */
export function ConfigDetail({ type, config }: { type: ConfigType; config: AnyConfig }) {
    switch (type) {
        case 'SALARY_GRADE': return <SalaryDetail c={config as SalaryGradeConfig} />;
        case 'PIT': return <PitDetail c={config as PitConfig} />;
        case 'INSURANCE': return <InsuranceDetail c={config as InsuranceConfig} />;
        case 'ALLOWANCE': return <AllowanceDetail c={config as AllowanceConfig} />;
    }
}

function meta(c: AnyConfig): { label: string; value: React.ReactNode }[] {
    return [
        { label: 'Effective from', value: c.effectiveFrom },
        { label: 'Status', value: c.status },
        { label: 'Legal basis', value: c.legalBasis },
        { label: 'Updated by', value: c.updatedBy ?? c.createdBy },
    ];
}

function SalaryDetail({ c }: { c: SalaryGradeConfig }) {
    const headers = ['Code', 'Title', 'Track', ...Array.from({ length: 10 }, (_, i) => `S${i + 1}`)];
    const rows = c.grades.map(g => [
        g.gradeCode, g.title ?? '—', g.track ?? '—',
        ...Array.from({ length: 10 }, (_, i) => g.steps[i] != null ? g.steps[i].toLocaleString('vi-VN') : ''),
    ]);
    return (
        <div className="space-y-4">
            <KVTable rows={[...meta(c), { label: 'Unit', value: c.unit }, { label: 'Min wage region I (nghìn₫)', value: c.minimumWageRegionI?.toLocaleString('vi-VN') }]} />
            <Section title="Grades (nghìn VND/bậc)"><GridTable headers={headers} rows={rows} /></Section>
        </div>
    );
}

function PitDetail({ c }: { c: PitConfig }) {
    const rows = c.brackets.map(b => [
        formatVnd(b.incomeFrom),
        b.incomeTo == null ? '∞' : formatVnd(b.incomeTo),
        pct(b.rate),
        formatVnd(b.quickDeduction),
    ]);
    return (
        <div className="space-y-4">
            <KVTable rows={[...meta(c),
                { label: 'Resolution', value: c.resolution },
                { label: 'Personal relief', value: formatVnd(c.personalRelief) },
                { label: 'Dependent relief', value: formatVnd(c.dependentRelief) }]} />
            <Section title="Progressive brackets"><GridTable headers={['From', 'To', 'Rate', 'Quick deduction']} rows={rows} /></Section>
        </div>
    );
}

function InsuranceDetail({ c }: { c: InsuranceConfig }) {
    return (
        <div className="space-y-4">
            <KVTable rows={[...meta(c),
                { label: 'Government base salary', value: c.governmentBaseSalary != null ? formatVnd(c.governmentBaseSalary) : '—' },
                { label: 'Insurance ceiling', value: c.insuranceCeiling != null ? formatVnd(c.insuranceCeiling) : '—' },
                { label: 'Statutory min wage', value: c.statutoryMinWage != null ? formatVnd(c.statutoryMinWage) : '—' },
                { label: 'Probation exempt', value: c.probationExempt ? 'Yes' : 'No' },
                { label: 'Eligible contract types', value: c.eligibleContractTypes.join(', ') || '—' }]} />
            <Section title="Rates">
                <GridTable headers={['Contribution', 'Employee', 'Employer']} rows={[
                    ['BHXH', pct(c.eeBhxh), `${pct(c.erBhxhPension)} + ${pct(c.erBhxhSicknessMaternity)} (pension+sickness), ${pct(c.erBhxhAccident)} accident`],
                    ['BHYT', pct(c.eeBhyt), pct(c.erBhyt)],
                    ['BHTN', pct(c.eeBhtn), pct(c.erBhtn)],
                ]} />
            </Section>
        </div>
    );
}

function AllowanceDetail({ c }: { c: AllowanceConfig }) {
    const living = c.levels.map(l => [l.levelKey, formatVnd(l.meal), formatVnd(l.phone), formatVnd(l.transport), formatVnd(l.housing)]);
    const jp = c.japaneseLevels.map(j => [j.jlptLevel, formatVnd(j.amount)]);
    return (
        <div className="space-y-4">
            <KVTable rows={[...meta(c),
                { label: 'Living prorated', value: c.livingProrated ? 'Yes' : 'No' },
                { label: 'Japanese prorated', value: c.japaneseProrated ? 'Yes' : 'No' },
                { label: 'Japanese min contract months', value: c.japaneseMinContractMonths ?? '—' }]} />
            <Section title="Living allowance (VND/month)">
                <GridTable headers={['Level', 'Meal', 'Phone', 'Transport', 'Housing']} rows={living} />
            </Section>
            {jp.length > 0 && (
                <Section title="Japanese language allowance">
                    <GridTable headers={['JLPT', 'Amount']} rows={jp} />
                </Section>
            )}
            <KVTable rows={[
                { label: 'Living eligible contracts', value: c.livingEligibleContracts.join(', ') || '—' },
                { label: 'Japanese eligible contracts', value: c.japaneseEligibleContracts.join(', ') || '—' },
                { label: 'Japanese excluded positions', value: c.japaneseExcludedPositions.join(', ') || '—' },
                { label: 'Japanese excluded levels', value: c.japaneseExcludedLevels.join(', ') || '—' },
            ]} />
        </div>
    );
}
