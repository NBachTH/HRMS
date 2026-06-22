"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { XCircleIcon, AlertTriangleIcon, CheckCircleIcon, BellIcon, RefreshCwIcon } from 'lucide-react';
import { closePeriod, remindAbsentees, rebuildTimesheets } from '@/app/services/AttendanceService';
import { getTimesheets } from '@/app/services/TimesheetService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { PeriodCloseResponse, UnexplainedAbsenceDto, Timesheet } from '@/app/commons/types';

type Step = 'form' | 'preview' | 'done';
const PAGE_SIZE = 10;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600">
            <span>Trang {page + 1} / {totalPages}</span>
            <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => onChange(page - 1)}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Trước</button>
                <button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Sau</button>
            </div>
        </div>
    );
}

export function ClosePeriodContent() {
    const { showToast } = useToast();
    const [step, setStep] = useState<Step>('form');
    const [loading, setLoading] = useState(false);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [notes, setNotes] = useState('');

    const [previewResult, setPreviewResult] = useState<PeriodCloseResponse | null>(null);
    const [absPage, setAbsPage] = useState(0);

    // Draft timesheets shown after the period is closed
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [tsLoading, setTsLoading] = useState(false);
    const [tsPage, setTsPage] = useState(0);
    const [rebuilding, setRebuilding] = useState(false);
    // Demo-only: front-end placeholder for the future "submit for approval" step (no backend yet).
    const [demoSubmitted, setDemoSubmitted] = useState(false);

    const handlePreview = async () => {
        setLoading(true);
        setAbsPage(0);
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

    const loadTimesheets = useCallback(async () => {
        setTsLoading(true);
        try {
            const res = await getTimesheets(year, month);
            setTimesheets(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được bảng công', 'error');
            setTimesheets([]);
        } finally {
            setTsLoading(false);
        }
    }, [year, month, showToast]);

    const handleForceClose = async () => {
        setLoading(true);
        try {
            const res = await closePeriod(year, month, notes, true);
            if (res.success && res.data?.closed) {
                setStep('done');
                setTsPage(0);
                showToast(`Đã chốt kỳ công ${String(month).padStart(2, '0')}/${year}`);
            } else {
                showToast(res.data?.message || 'Không thể chốt kỳ', 'error');
            }
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to close period', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (step === 'done') loadTimesheets(); }, [step, loadTimesheets]);

    const handleRebuild = async () => {
        setRebuilding(true);
        try {
            await rebuildTimesheets(year, month);
            showToast('Đã tính lại bảng công tổng hợp');
            await loadTimesheets();
        } catch (err: any) {
            showToast(err?.body?.message || 'Tính lại thất bại', 'error');
        } finally {
            setRebuilding(false);
        }
    };

    const [reminding, setReminding] = useState(false);
    const handleRemind = async () => {
        setReminding(true);
        try {
            const res = await remindAbsentees(year, month);
            showToast(`Đã gửi nhắc nhở tới ${res.data?.notified ?? 0} nhân viên`);
        } catch (err: any) {
            showToast(err?.body?.message || 'Gửi nhắc nhở thất bại', 'error');
        } finally {
            setReminding(false);
        }
    };

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    const absences = previewResult?.unexplainedAbsences ?? [];
    const absTotalPages = Math.ceil(absences.length / PAGE_SIZE);
    const absVisible = absences.slice(absPage * PAGE_SIZE, absPage * PAGE_SIZE + PAGE_SIZE);

    const tsTotalPages = Math.ceil(timesheets.length / PAGE_SIZE);
    const tsVisible = timesheets.slice(tsPage * PAGE_SIZE, tsPage * PAGE_SIZE + PAGE_SIZE);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <XCircleIcon className="w-7 h-7" /> Chốt kỳ công
                </h1>
                <p className="text-sm text-gray-500">Sau khi chốt, kỳ công bị khóa và sinh bảng công tổng hợp (timesheet).</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8 max-w-md">
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
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-5 max-w-2xl">
                    <h2 className="font-semibold text-gray-800">Bước 1: Chọn kỳ</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                            <select value={year} onChange={e => setYear(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="VD: Chốt công cuối tháng…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                    </div>
                    <button onClick={handlePreview} disabled={loading}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                        {loading ? 'Đang kiểm tra…' : 'Kiểm tra & Xem trước →'}
                    </button>
                </div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && previewResult && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-800">Bước 2: Kiểm tra trước khi chốt</h2>
                            <p className="text-sm text-gray-500 mt-1">Kỳ: <strong>{String(month).padStart(2, '0')}/{year}</strong></p>
                        </div>

                        {absences.length === 0 ? (
                            <div className="m-6 flex items-center gap-2 text-green-700 bg-green-50 rounded-md px-4 py-3">
                                <CheckCircleIcon className="w-5 h-5 flex-none" />
                                <span className="text-sm">Không có ngày vắng thiếu lý do. An toàn để chốt.</span>
                            </div>
                        ) : (
                            <>
                                <div className="m-6 mb-3 flex items-center gap-2 text-amber-700 bg-amber-50 rounded-md px-4 py-3">
                                    <AlertTriangleIcon className="w-5 h-5 flex-none" />
                                    <span className="text-sm"><strong>{absences.length}</strong> nhân viên có ngày vắng thiếu lý do.</span>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày thiếu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {absVisible.map((a: UnexplainedAbsenceDto) => (
                                            <tr key={a.employeeId}>
                                                <td className="px-6 py-2 font-medium">{a.employeeName || a.employeeId}</td>
                                                <td className="px-6 py-2 text-gray-600">{a.missingDates.join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <Pager page={absPage} totalPages={absTotalPages} onChange={setAbsPage} />
                            </>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep('form')} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
                            ← Quay lại
                        </button>
                        {absences.length > 0 && (
                            <button onClick={handleRemind} disabled={reminding}
                                className="flex-1 inline-flex items-center justify-center gap-1 py-2 border border-amber-400 text-amber-700 rounded-md hover:bg-amber-50 disabled:opacity-50 text-sm font-medium">
                                <BellIcon className="w-4 h-4" /> {reminding ? 'Đang gửi…' : 'Gửi nhắc nhở'}
                            </button>
                        )}
                        <button onClick={handleForceClose} disabled={loading}
                            className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                            {loading ? 'Đang chốt…' : absences.length > 0 ? 'Vẫn chốt (ghi nhận nghỉ không lương)' : 'Chốt kỳ'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Done — draft timesheet review */}
            {step === 'done' && (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-500 flex-none" />
                        <div className="flex-1">
                            <p className="font-semibold text-green-800">Đã chốt kỳ {String(month).padStart(2, '0')}/{year}</p>
                            <p className="text-sm text-green-700">Bảng công tổng hợp đã được sinh.</p>
                        </div>
                        <button onClick={() => { setStep('form'); setPreviewResult(null); setNotes(''); setTimesheets([]); setDemoSubmitted(false); }}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
                            Chốt kỳ khác
                        </button>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                            <h2 className="font-semibold text-gray-800">Bảng công tổng hợp — {timesheets.length} nhân viên</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={handleRebuild} disabled={rebuilding || demoSubmitted}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                                    <RefreshCwIcon className="w-4 h-4" /> {rebuilding ? 'Đang tính…' : 'Tính lại bảng công'}
                                </button>
                                {demoSubmitted ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md">
                                        <CheckCircleIcon className="w-4 h-4" /> Đã Submit
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => { setDemoSubmitted(true); showToast('Đã submit bảng công'); }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        title="Demo: bước trình duyệt bảng công sẽ được nối backend sau">
                                        Submit
                                    </button>
                                )}
                            </div>
                        </div>

                        {tsLoading ? (
                            <div className="p-6 text-center text-gray-500">Đang tải…</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {['Nhân viên', 'Công chuẩn', 'Công thực tế', 'Tổng công hưởng lương', 'OT (giờ)', 'Nghỉ phép', 'Vắng KLD', 'Muộn/sớm (giờ)'].map(h =>
                                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tsVisible.length === 0 ? (
                                            <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Chưa có bảng công</td></tr>
                                        ) : tsVisible.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900">{t.employeeName || t.employeeId}</td>
                                                <td className="px-4 py-2 text-gray-700">{t.standardWorkingDays}</td>
                                                <td className="px-4 py-2 text-gray-700">{t.actualWorkingDays}</td>
                                                <td className="px-4 py-2 text-gray-900 font-medium">{t.totalPaidDays}</td>
                                                <td className="px-4 py-2 text-gray-700">{t.otHours}</td>
                                                <td className="px-4 py-2 text-gray-700">{t.annualLeaveDays}</td>
                                                <td className={`px-4 py-2 ${t.unexplainedAbsenceDays > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>{t.unexplainedAbsenceDays}</td>
                                                <td className="px-4 py-2 text-gray-700">{t.lateEarlyTotalHours ?? 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <Pager page={tsPage} totalPages={tsTotalPages} onChange={setTsPage} />
                    </div>
                </div>
            )}
        </div>
    );
}
