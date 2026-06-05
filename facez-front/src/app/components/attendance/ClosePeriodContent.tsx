"use client";

import React, { useState } from 'react';
import { XCircleIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';
import { closePeriod } from '@/app/services/AttendanceService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { PeriodCloseResponse, UnexplainedAbsenceDto } from '@/app/commons/types';

type Step = 'form' | 'preview' | 'done';

export function ClosePeriodContent() {
    const { showToast } = useToast();
    const [step, setStep] = useState<Step>('form');
    const [loading, setLoading] = useState(false);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [notes, setNotes] = useState('');

    const [previewResult, setPreviewResult] = useState<PeriodCloseResponse | null>(null);

    const handlePreview = async () => {
        setLoading(true);
        try {
            const res = await closePeriod(year, month, notes, false);
            if (res.success && res.data) {
                setPreviewResult(res.data);
                setStep('preview');
            }
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to check period', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForceClose = async () => {
        setLoading(true);
        try {
            const res = await closePeriod(year, month, notes, true);
            if (res.success) {
                setStep('done');
                showToast(`Period ${String(month).padStart(2, '0')}/${year} closed successfully`);
            }
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to close period', 'error');
        } finally {
            setLoading(false);
        }
    };

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <XCircleIcon className="w-7 h-7" /> Close Attendance Period
                </h1>
                <p className="text-sm text-gray-500">Once a period is closed, it cannot be reopened.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
                {(['form', 'preview', 'done'] as Step[]).map((s, i) => (
                    <React.Fragment key={s}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s ? 'bg-blue-600 text-white' : i < (['form', 'preview', 'done'] as Step[]).indexOf(step) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {i + 1}
                        </div>
                        {i < 2 && <div className={`flex-1 h-0.5 ${i < (['form', 'preview', 'done'] as Step[]).indexOf(step) ? 'bg-green-500' : 'bg-gray-200'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Form */}
            {step === 'form' && (
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
                    <h2 className="font-semibold text-gray-800">Step 1: Select Period</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select value={year} onChange={e => setYear(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. End of month processing..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                    </div>
                    <button onClick={handlePreview} disabled={loading}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                        {loading ? 'Checking…' : 'Check & Preview →'}
                    </button>
                </div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && previewResult && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="font-semibold text-gray-800 mb-4">Step 2: Review Before Closing</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Period: <strong>{String(month).padStart(2, '0')}/{year}</strong>
                        </p>

                        {previewResult.unexplainedAbsences.length === 0 ? (
                            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-md px-4 py-3">
                                <CheckCircleIcon className="w-5 h-5 flex-none" />
                                <span className="text-sm">No unexplained absences found. Safe to close.</span>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-md px-4 py-3 mb-3">
                                    <AlertTriangleIcon className="w-5 h-5 flex-none" />
                                    <span className="text-sm">
                                        <strong>{previewResult.unexplainedAbsences.length}</strong> employee(s) have unexplained absences.
                                    </span>
                                </div>
                                <div className="border border-gray-200 rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Employee</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Missing Dates</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {previewResult.unexplainedAbsences.map((a: UnexplainedAbsenceDto) => (
                                                <tr key={a.employeeId}>
                                                    <td className="px-4 py-2 font-medium">{a.employeeName || a.employeeId}</td>
                                                    <td className="px-4 py-2 text-gray-600">{a.missingDates.join(', ')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep('form')} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
                            ← Back
                        </button>
                        <button onClick={handleForceClose} disabled={loading}
                            className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                            {loading ? 'Closing…' : previewResult.unexplainedAbsences.length > 0 ? 'Force Close Anyway' : 'Close Period'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Done */}
            {step === 'done' && (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <CheckCircleIcon className="w-14 h-14 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Period Closed</h2>
                    <p className="text-gray-600 text-sm mb-6">
                        Attendance period <strong>{String(month).padStart(2, '0')}/{year}</strong> has been closed successfully.
                    </p>
                    <button onClick={() => { setStep('form'); setPreviewResult(null); setNotes(''); }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                        Close Another Period
                    </button>
                </div>
            )}
        </div>
    );
}
