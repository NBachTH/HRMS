"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Send, Check, X, Banknote, Lock, Trash2 } from 'lucide-react';
import {
    getRuns, getRunLines, createRun, recalcRun, recalcLine, excludeLine,
    submitRun, approveRun, rejectRun, markRunPaid, deleteRun, type PayrollRun,
} from '@/app/services/PayrollRunService';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { Modal } from '@/app/components/common/Modal';
import { getEffectiveConfigs, type EffectiveConfig } from '@/app/services/PayrollConfigService';
import { formatVnd } from '@/app/commons/utils/formatters';
import type { Payroll } from '@/app/commons/types';

const CONFIG_LABEL: Record<string, string> = {
    SALARY_GRADE: 'Bậc lương',
    ALLOWANCE: 'Phụ cấp',
    PIT: 'Thuế TNCN',
    INSURANCE: 'Bảo hiểm',
};

function DetailRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
    return (
        <div className={`flex justify-between py-1.5 border-b border-gray-100 last:border-0 ${strong ? 'font-semibold' : ''}`}>
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm ${strong ? 'text-gray-900' : 'text-gray-700'}`}>{value}</span>
        </div>
    );
}

const now = new Date();
const BADGE: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    PAID: 'bg-blue-100 text-blue-800',
};

export function PayrollRunContent() {
    const { role } = useAuth();
    const { showToast } = useToast();
    const isFinance = role === 'FINANCE_ADMIN' || role === 'SYSTEM_ADMIN';
    const isDirector = role === 'DIRECTOR' || role === 'SYSTEM_ADMIN';

    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [selected, setSelected] = useState<PayrollRun | null>(null);
    const [lines, setLines] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [showCreate, setShowCreate] = useState(false);
    const [detailLine, setDetailLine] = useState<Payroll | null>(null);
    const [effConfigs, setEffConfigs] = useState<EffectiveConfig[]>([]);

    // Load the config versions that the chosen period will resolve to (shown in the create modal).
    useEffect(() => {
        if (!showCreate) return;
        getEffectiveConfigs(year, month)
            .then(r => setEffConfigs(Array.isArray(r.data) ? r.data : []))
            .catch(() => setEffConfigs([]));
    }, [showCreate, year, month]);

    const fetchRuns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getRuns();
            setRuns(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được danh sách kỳ lương', 'error');
        } finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { fetchRuns(); }, [fetchRuns]);

    const openRun = async (run: PayrollRun) => {
        setSelected(run);
        try {
            const res = await getRunLines(run.id);
            setLines(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được bảng lương', 'error');
            setLines([]);
        }
    };

    const refreshSelected = async (run: PayrollRun) => {
        await fetchRuns();
        await openRun(run);
    };

    const createAndCalc = async () => {
        setBusy(true);
        try {
            const res = await createRun(year, month);
            showToast('Đã tạo kỳ lương và tính lương cho toàn bộ nhân viên');
            setShowCreate(false);
            await fetchRuns();
            if (res?.data?.id) await openRun(res.data);
        } catch (err: any) {
            showToast(err?.body?.message || 'Tạo kỳ lương thất bại', 'error');
        } finally { setBusy(false); }
    };

    const recalcDetail = async () => {
        if (!selected || !detailLine?.employeeId) return;
        setBusy(true);
        try {
            await recalcLine(selected.id, detailLine.employeeId);
            showToast('Đã tính lại dòng');
            const res = await getRunLines(selected.id);
            const newLines = Array.isArray(res.data) ? res.data : [];
            setLines(newLines);
            setDetailLine(newLines.find(l => l.employeeId === detailLine.employeeId) ?? null);
            await fetchRuns();
        } catch (err: any) {
            showToast(err?.body?.message || 'Tính lại thất bại', 'error');
        } finally { setBusy(false); }
    };

    const deleteSelectedRun = async () => {
        if (!selected) return;
        if (!window.confirm(`Xóa kỳ lương ${String(selected.month).padStart(2, '0')}/${selected.year}? Toàn bộ dòng lương của kỳ sẽ bị xóa.`)) return;
        setBusy(true);
        try {
            await deleteRun(selected.id);
            showToast('Đã xóa kỳ lương');
            setSelected(null);
            setLines([]);
            await fetchRuns();
        } catch (err: any) {
            showToast(err?.body?.message || 'Xóa kỳ lương thất bại', 'error');
        } finally { setBusy(false); }
    };

    const act = async (fn: () => Promise<any>, msg: string, run?: PayrollRun) => {
        setBusy(true);
        try {
            const res = await fn();
            showToast(msg);
            if (run || (res?.data && res.data.id)) await refreshSelected(run ?? res.data);
            else await fetchRuns();
        } catch (err: any) {
            showToast(err?.body?.message || 'Thao tác thất bại', 'error');
        } finally { setBusy(false); }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1">Payroll Runs</h1>
                    <p className="text-sm text-gray-500">Kỳ lương: tạo → tính → submit (Finance) → duyệt (Director) → trả lương</p>
                </div>
                {isFinance && (
                    <button disabled={busy} onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); setShowCreate(true); }}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        + Tạo kỳ lương
                    </button>
                )}
            </div>

            {/* Runs list */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                {loading ? <div className="p-6 text-center text-gray-500">Đang tải…</div> : (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Kỳ', 'Số NV', 'Tổng Gross', 'Tổng Net', 'Trạng thái', ''].map(h =>
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {runs.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chưa có kỳ lương nào</td></tr>
                            ) : runs.map(r => (
                                <tr key={r.id} onClick={() => openRun(r)}
                                    className={`hover:bg-blue-50/50 cursor-pointer ${selected?.id === r.id ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{String(r.month).padStart(2, '0')}/{r.year}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{r.employeeCount}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{formatVnd(r.totalGross)}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatVnd(r.totalNet)}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full font-medium ${BADGE[r.status] || 'bg-gray-100'}`}>{r.status?.replace(/_/g, ' ')}</span></td>
                                    <td className="px-6 py-4 text-sm text-blue-600">Xem →</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Selected run detail */}
            {selected && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-lg font-semibold text-gray-800">
                            Kỳ {String(selected.month).padStart(2, '0')}/{selected.year} — <span className="text-sm text-gray-500">{selected.status?.replace(/_/g, ' ')}</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            {isFinance && selected.status === 'DRAFT' && (
                                <>
                                    <button disabled={busy} onClick={() => act(() => recalcRun(selected.id), 'Đã tính lại cả kỳ', selected)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
                                        <RefreshCw className="w-4 h-4" /> Tính lại cả kỳ
                                    </button>
                                    <button disabled={busy} onClick={() => act(() => submitRun(selected.id), 'Đã submit kỳ', selected)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                        <Send className="w-4 h-4" /> Submit
                                    </button>
                                    <button disabled={busy} onClick={deleteSelectedRun}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50">
                                        <Trash2 className="w-4 h-4" /> Xóa kỳ
                                    </button>
                                </>
                            )}
                            {isDirector && selected.status === 'PENDING_APPROVAL' && (
                                <>
                                    <button disabled={busy} onClick={() => act(() => approveRun(selected.id), 'Đã duyệt kỳ', selected)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                                        <Check className="w-4 h-4" /> Duyệt
                                    </button>
                                    <button disabled={busy} onClick={() => { const r = prompt('Lý do trả lại?') || ''; act(() => rejectRun(selected.id, r), 'Đã trả lại kỳ', selected); }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                                        <X className="w-4 h-4" /> Trả lại
                                    </button>
                                </>
                            )}
                            {isFinance && selected.status === 'APPROVED' && (
                                <button disabled={busy} onClick={() => act(() => markRunPaid(selected.id), 'Đã đánh dấu trả lương', selected)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50">
                                    <Banknote className="w-4 h-4" /> Đánh dấu đã trả
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Nhân viên', 'Gross', 'Net', 'Trạng thái', ''].map(h =>
                                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {lines.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400">Không có dòng lương</td></tr>
                                ) : lines.map(p => (
                                    <tr key={p.payrollId} className={p.status === 'REJECTED' ? 'bg-red-50/40' : ''}>
                                        <td className="px-6 py-3 text-sm font-medium">
                                            <button onClick={() => setDetailLine(p)}
                                                className="text-blue-700 hover:text-blue-900 hover:underline text-left">
                                                {p.employeeName || p.employeeId}
                                            </button>
                                            {p.locked && <Lock className="inline w-3 h-3 ml-1 text-gray-400" />}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-gray-700">{formatVnd(p.totalGross)}</td>
                                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{formatVnd(p.netSalary)}</td>
                                        <td className="px-6 py-3"><span className={`px-2 py-1 text-xs rounded-full ${BADGE[p.status] || 'bg-gray-100'}`}>{p.status}</span></td>
                                        <td className="px-6 py-3 text-right whitespace-nowrap">
                                            {isFinance && selected.status === 'DRAFT' && p.status !== 'REJECTED' && (
                                                <>
                                                    <button disabled={busy} onClick={() => act(() => recalcLine(selected.id, p.employeeId!), 'Đã tính lại dòng', selected)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs">Tính lại</button>
                                                    <button disabled={busy} onClick={() => { const r = prompt('Lý do loại dòng này?') || ''; act(() => excludeLine(selected.id, p.employeeId!, r), 'Đã loại dòng', selected); }}
                                                        className="ml-3 text-red-600 hover:text-red-800 text-xs">Loại</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create-run modal: pick month/year, then create + batch-calculate */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo kỳ lương" width="max-w-md">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                        </div>
                    </div>
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                            Cấu hình lương áp dụng cho kỳ này (bản PUBLISHED hiệu lực)
                        </div>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-100">
                                {effConfigs.map(c => (
                                    <tr key={c.configType}>
                                        <td className="px-3 py-2 text-gray-600 w-28">{CONFIG_LABEL[c.configType] || c.configType}</td>
                                        <td className="px-3 py-2">
                                            {c.found ? (
                                                <span className="text-gray-800">
                                                    Hiệu lực từ <strong>{c.effectiveFrom}</strong>
                                                    {c.legalBasis && <span className="text-gray-400"> — {c.legalBasis}</span>}
                                                </span>
                                            ) : (
                                                <span className="text-red-600">⚠ Chưa có bản PUBLISHED hiệu lực</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-3">
                        Tạo kỳ lương sẽ tính lương (batch) cho toàn bộ nhân viên đang làm việc: HS1 lấy từ điểm cấp trên,
                        HS2/Nt/NCtt suy tự động từ bảng công đã chốt. Kỳ công của tháng phải được chốt trước.
                    </p>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button onClick={() => setShowCreate(false)}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
                        <button disabled={busy} onClick={createAndCalc}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {busy ? 'Đang tính…' : 'Tạo & tính lương'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Payslip detail modal */}
            <Modal isOpen={!!detailLine} onClose={() => setDetailLine(null)}
                title={detailLine ? `Phiếu lương — ${detailLine.employeeName || detailLine.employeeId}` : ''} width="max-w-lg">
                {detailLine && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                Kỳ {String(detailLine.payrollMonth).padStart(2, '0')}/{detailLine.payrollYear}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${BADGE[detailLine.status] || 'bg-gray-100'}`}>
                                {detailLine.status}
                            </span>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Thu nhập</p>
                            <DetailRow label="Lương hiệu quả (đã ×HStb)" value={formatVnd(detailLine.performanceSalary)} />
                            <DetailRow label="Phụ cấp chức vụ (Li)" value={formatVnd(detailLine.positionCoefficient)} />
                            <DetailRow label="Phụ cấp sinh hoạt" value={formatVnd(detailLine.livingAllowance)} />
                            <DetailRow label="Lương tăng ca (OT)" value={formatVnd(detailLine.otPay)} />
                            <DetailRow label={`Ngày công (NCtt/Nt)`} value={`${detailLine.actualWorkingDays}/${detailLine.standardWorkingDays}`} />
                            <DetailRow label="HS1 / HS2 / HStb" value={`${detailLine.kpi1Score?.toFixed(2)} / ${detailLine.kpi2Score?.toFixed(2)} / ${detailLine.kpiAverage?.toFixed(2)}`} />
                            <DetailRow label="Tổng Gross" value={formatVnd(detailLine.totalGross)} strong />
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Khấu trừ</p>
                            <DetailRow label="BHXH (8%)" value={formatVnd(detailLine.bhxhEmployee)} />
                            <DetailRow label="BHYT (1.5%)" value={formatVnd(detailLine.bhytEmployee)} />
                            <DetailRow label="BHTN (1%)" value={formatVnd(detailLine.bhtnEmployee)} />
                            <DetailRow label={`Thuế TNCN (${detailLine.dependentCount} NPT)`} value={formatVnd(detailLine.pit)} />
                        </div>

                        <div>
                            <DetailRow label="Lương thực nhận (Net)" value={formatVnd(detailLine.netSalary)} strong />
                            {detailLine.totalEmploymentCost != null && (
                                <DetailRow label="Tổng chi phí lao động" value={formatVnd(detailLine.totalEmploymentCost)} />
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <button onClick={() => setDetailLine(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Đóng</button>
                            {isFinance && selected?.status === 'DRAFT' && detailLine.status !== 'REJECTED' && (
                                <button disabled={busy} onClick={recalcDetail}
                                    className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                    <RefreshCw className="w-4 h-4" /> {busy ? 'Đang tính…' : 'Tính lại dòng'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
