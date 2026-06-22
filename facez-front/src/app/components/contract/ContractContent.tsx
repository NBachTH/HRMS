"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Edit2Icon, Trash2Icon, AlertTriangleIcon, PaperclipIcon, CheckCircleIcon, XCircleIcon, PlusIcon, UsersIcon } from 'lucide-react';
import { getContracts, getExpiringSoon, createContract, updateContract, deleteContract, approveContract, rejectContract } from '@/app/services/ContractService';
import { getByEmployee as getDependents, createDependent, deleteDependent } from '@/app/services/TaxDependentService';
import { getEmployees } from '@/app/services/EmployeeService';
import { Modal } from '@/app/components/common/Modal';
import { Pagination } from '@/app/components/common/Pagination';
import { ContractDocumentModal } from './ContractDocumentModal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { formatVnd, formatDate } from '@/app/commons/utils/formatters';
import type { Contract, Employee, TaxDependent } from '@/app/commons/types';

const CONTRACT_TYPES = ['PROBATION', 'FULLTIME', 'PARTTIME'];
const POSITION_CODES = ['NV1', 'NV2', 'TL1', 'TL2', 'DL', 'BOD2', 'BOD'];

// ── Dependents sub-section (used inside the contract create/edit form) ─────────
function DependentsSection({ employeeId }: { employeeId: string }) {
    const { showToast } = useToast();
    const [list, setList] = useState<TaxDependent[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState({ fullName: '', relationship: 'CHILD', dateOfBirth: '', nationalId: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getDependents(employeeId);
            setList((res.data ?? []).filter(d => d.active));
        } catch { setList([]); } finally { setLoading(false); }
    }, [employeeId]);

    useEffect(() => { load(); }, [load]);

    const add = async () => {
        if (!draft.fullName.trim()) { showToast('Nhập họ tên người phụ thuộc', 'error'); return; }
        try {
            await createDependent({
                employeeId, fullName: draft.fullName.trim(), relationship: draft.relationship,
                dateOfBirth: draft.dateOfBirth || undefined, nationalId: draft.nationalId || undefined, active: true,
            } as any);
            setDraft({ fullName: '', relationship: 'CHILD', dateOfBirth: '', nationalId: '' });
            setAdding(false);
            load();
        } catch (err: any) { showToast(err?.body?.message || 'Thêm thất bại', 'error'); }
    };

    const remove = async (id: string) => {
        try { await deleteDependent(id); load(); }
        catch (err: any) { showToast(err?.body?.message || 'Xóa thất bại', 'error'); }
    };

    return (
        <div className="border border-gray-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" /> Người phụ thuộc — số lượng: <strong>{list.length}</strong>
                </span>
                <button type="button" onClick={() => setAdding(a => !a)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
                    <PlusIcon className="w-3.5 h-3.5" /> Thêm
                </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">Số người phụ thuộc trên hợp đồng được tính tự động từ danh sách này (dùng cho giảm trừ thuế).</p>

            {adding && (
                <div className="grid grid-cols-2 gap-2 mb-2 bg-gray-50 rounded-md p-2">
                    <input value={draft.fullName} onChange={e => setDraft(d => ({ ...d, fullName: e.target.value }))}
                        placeholder="Họ tên *" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                    <select value={draft.relationship} onChange={e => setDraft(d => ({ ...d, relationship: e.target.value }))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm">
                        <option value="CHILD">Con</option>
                        <option value="PARENT">Cha/Mẹ</option>
                        <option value="SPOUSE">Vợ/Chồng</option>
                        <option value="OTHER">Khác</option>
                    </select>
                    <input type="date" value={draft.dateOfBirth} onChange={e => setDraft(d => ({ ...d, dateOfBirth: e.target.value }))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm" />
                    <input value={draft.nationalId} onChange={e => setDraft(d => ({ ...d, nationalId: e.target.value }))}
                        placeholder="CCCD" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                    <div className="col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setAdding(false)} className="px-3 py-1 text-xs border border-gray-300 rounded">Hủy</button>
                        <button type="button" onClick={add} className="px-3 py-1 text-xs bg-blue-600 text-white rounded">Lưu</button>
                    </div>
                </div>
            )}

            {loading ? (
                <p className="text-xs text-gray-400">Đang tải…</p>
            ) : list.length === 0 ? (
                <p className="text-xs text-gray-400">Chưa có người phụ thuộc.</p>
            ) : (
                <ul className="divide-y divide-gray-100">
                    {list.map(d => (
                        <li key={d.id} className="flex items-center justify-between py-1.5 text-sm">
                            <span>{d.fullName} <span className="text-gray-400 text-xs">({d.relationship})</span></span>
                            <button type="button" onClick={() => remove(d.id)} className="text-red-500 hover:text-red-700 text-xs">Xóa</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Read-only contract detail ─────────────────────────────────────────────────
const STATUS_FLOW = ['PENDING_APPROVAL', 'ACTIVE', 'EXPIRED'];
const STATUS_VI: Record<string, string> = {
    PENDING_APPROVAL: 'Chờ duyệt', ACTIVE: 'Hiệu lực', REJECTED: 'Bị từ chối', EXPIRED: 'Hết hạn', TERMINATED: 'Đã chấm dứt',
};

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 font-medium text-right">{value ?? '—'}</span>
        </div>
    );
}

function ContractDetailModal({ contract, onClose, onAttach }: {
    contract: Contract | null; onClose: () => void; onAttach: (c: Contract) => void;
}) {
    return (
        <Modal isOpen={contract !== null} onClose={onClose}
            title={contract ? `Hợp đồng — ${contract.employeeName || contract.employeeId}` : ''} width="max-w-2xl">
            {contract && (
                <div className="space-y-4">
                    {/* status stepper */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {contract.status === 'REJECTED' ? (
                            <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">Bị từ chối</span>
                        ) : STATUS_FLOW.map((s, i) => {
                            const curIdx = STATUS_FLOW.indexOf(contract.status);
                            const done = curIdx >= 0 && i <= curIdx;
                            return (
                                <React.Fragment key={s}>
                                    <span className={`px-3 py-1 text-xs rounded-full ${done ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {STATUS_VI[s]}
                                    </span>
                                    {i < STATUS_FLOW.length - 1 && <span className="text-gray-300">→</span>}
                                </React.Fragment>
                            );
                        })}
                        {contract.current && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Đang áp dụng</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-x-6">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Nhân sự</p>
                            <DRow label="Nhân viên" value={contract.employeeName || contract.employeeId} />
                            <DRow label="Loại hợp đồng" value={contract.contractType} />
                            <DRow label="Ngạch" value={contract.positionCode} />
                            <DRow label="Bậc" value={contract.salaryStep != null ? `Bậc ${contract.salaryStep}` : '—'} />
                            <DRow label="Số người phụ thuộc" value={contract.dependentCount ?? 0} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Lương & thời hạn</p>
                            <DRow label="Lương cơ bản" value={contract.baseSalary != null ? formatVnd(contract.baseSalary) : '—'} />
                            <DRow label="Lương đóng BH" value={contract.insuranceBase != null ? formatVnd(contract.insuranceBase) : '—'} />
                            <DRow label="Ngày bắt đầu" value={contract.startDate ? formatDate(contract.startDate) : '—'} />
                            <DRow label="Ngày kết thúc" value={contract.endDate ? formatDate(contract.endDate) : 'Vô thời hạn'} />
                            <DRow label="Hiệu lực từ" value={contract.effectiveFrom ? formatDate(contract.effectiveFrom) : '—'} />
                        </div>
                    </div>

                    {contract.terms && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Điều khoản</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.terms}</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <button onClick={() => onAttach(contract)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                            <PaperclipIcon className="w-4 h-4" /> {contract.hasDocument ? 'Xem tài liệu' : 'Đính kèm tài liệu'}
                        </button>
                        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Đóng</button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

interface ContractFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contract?: Contract | null;
    employees: Employee[];
}

function ContractFormModal({ isOpen, onClose, onSuccess, contract, employees }: ContractFormProps) {
    const { showToast } = useToast();
    const isEdit = !!contract;
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const blank = {
        employeeId: '', contractType: 'FULLTIME', startDate: '', endDate: '', terms: '',
        baseSalary: '', insuranceBase: '', positionCode: 'NV1', salaryStep: '1',
    };
    const [form, setForm] = useState(blank);

    useEffect(() => {
        if (contract) {
            setForm({
                employeeId: contract.employeeId ?? '',
                contractType: contract.contractType ?? 'FULLTIME',
                startDate: contract.startDate ?? '',
                endDate: contract.endDate ?? '',
                terms: contract.terms ?? '',
                baseSalary: contract.baseSalary?.toString() ?? '',
                insuranceBase: contract.insuranceBase?.toString() ?? '',
                positionCode: contract.positionCode ?? 'NV1',
                salaryStep: contract.salaryStep?.toString() ?? '1',
            });
        } else {
            setForm(blank);
        }
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contract, isOpen]);

    const set = (field: string, value: string) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.employeeId) errs.employeeId = 'Bắt buộc chọn nhân viên';
        if (!form.contractType) errs.contractType = 'Bắt buộc chọn loại hợp đồng';
        if (!form.startDate) errs.startDate = 'Bắt buộc nhập ngày bắt đầu';
        if (!form.baseSalary || Number(form.baseSalary) <= 0) errs.baseSalary = 'Bắt buộc nhập lương cơ bản';
        if (!form.positionCode) errs.positionCode = 'Bắt buộc chọn ngạch';
        if (!form.salaryStep || Number(form.salaryStep) < 1) errs.salaryStep = 'Bắt buộc chọn bậc';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                employeeId: form.employeeId,
                contractType: form.contractType,
                startDate: form.startDate,
                endDate: form.endDate || undefined,
                terms: form.terms || undefined,
                baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
                insuranceBase: form.insuranceBase ? Number(form.insuranceBase) : undefined,
                positionCode: form.positionCode || undefined,
                salaryStep: form.salaryStep ? Number(form.salaryStep) : undefined,
            };
            if (isEdit && contract) {
                await updateContract(contract.id, payload);
                showToast('Contract updated');
            } else {
                await createContract(payload);
                showToast('Contract created');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to save contract', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Sửa hợp đồng (tạo bản chờ duyệt)' : 'Tạo hợp đồng mới'} width="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={form.employeeId}
                        onChange={e => set('employeeId', e.target.value)}
                        disabled={isEdit}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50
                            ${errors.employeeId ? 'border-red-400' : 'border-gray-300'}`}
                    >
                        <option value="">— Select employee —</option>
                        {employees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                                {emp.name} ({emp.employeeId})
                            </option>
                        ))}
                    </select>
                    {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contract Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.contractType}
                            onChange={e => set('contractType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={e => set('startDate', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                                ${errors.startDate ? 'border-red-400' : 'border-gray-300'}`}
                        />
                        {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={form.endDate}
                            onChange={e => set('endDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ngạch (positionCode) <span className="text-red-500">*</span>
                        </label>
                        <select value={form.positionCode} onChange={e => set('positionCode', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.positionCode ? 'border-red-400' : 'border-gray-300'}`}>
                            {POSITION_CODES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bậc (salaryStep) <span className="text-red-500">*</span>
                        </label>
                        <select value={form.salaryStep} onChange={e => set('salaryStep', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.salaryStep ? 'border-red-400' : 'border-gray-300'}`}>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(s => <option key={s} value={s}>Bậc {s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lương cơ bản (VND) <span className="text-red-500">*</span>
                        </label>
                        <input type="number" min={0} value={form.baseSalary}
                            onChange={e => set('baseSalary', e.target.value)} placeholder="VD: 40000000"
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.baseSalary ? 'border-red-400' : 'border-gray-300'}`} />
                        {errors.baseSalary && <p className="text-xs text-red-500 mt-1">{errors.baseSalary}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lương đóng bảo hiểm (VND)</label>
                        <input type="number" min={0} value={form.insuranceBase}
                            onChange={e => set('insuranceBase', e.target.value)} placeholder="Mặc định = lương cơ bản"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                </div>

                {/* #5 — người phụ thuộc (dependentCount tự đếm từ danh sách này) */}
                {form.employeeId && (
                    <DependentsSection employeeId={form.employeeId} />
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Điều khoản</label>
                    <textarea
                        rows={3}
                        value={form.terms}
                        onChange={e => set('terms', e.target.value)}
                        placeholder="Điều khoản hợp đồng…"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                </div>

                <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-md p-2">
                    Hợp đồng mới/sửa sẽ ở trạng thái <strong>Chờ duyệt</strong> và chỉ có hiệu lực (dùng để tính lương)
                    sau khi <strong>Giám đốc</strong> phê duyệt.
                </p>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Hủy
                    </button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Đang lưu…' : isEdit ? 'Lưu (trình duyệt)' : 'Tạo hợp đồng'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

type ViewTab = 'all' | 'expiring';

export function ContractContent() {
    const { showToast } = useToast();
    const { role } = useAuth();
    const canWrite = role === 'HR_ADMIN';
    const isDirector = role === 'DIRECTOR';
    const [busy, setBusy] = useState<string | null>(null);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Contract | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [docTarget, setDocTarget] = useState<Contract | null>(null);
    const [detailItem, setDetailItem] = useState<Contract | null>(null);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<ViewTab>('all');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [contractsRes, empRes] = await Promise.all([
                activeTab === 'expiring' ? getExpiringSoon(30) : getContracts(page, 20),
                getEmployees(0, 100),
            ]);
            if (contractsRes.success && contractsRes.data) {
                const d: any = contractsRes.data;
                setContracts(Array.isArray(d) ? d : (d?.content ?? []));
                setTotalPages(Array.isArray(d) ? 1 : (d?.totalPages ?? 1));
            }
            if (empRes.success && empRes.data) setEmployees(empRes.data.content);
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load contracts');
        } finally {
            setLoading(false);
        }
    }, [activeTab, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string) => {
        try {
            await deleteContract(id);
            showToast('Contract deleted');
            setDeleteConfirm(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    const handleApprove = async (id: string) => {
        setBusy(id);
        try {
            await approveContract(id);
            showToast('Đã duyệt — hợp đồng có hiệu lực');
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Duyệt thất bại', 'error');
        } finally { setBusy(null); }
    };

    const handleReject = async (id: string) => {
        setBusy(id);
        try {
            await rejectContract(id);
            showToast('Đã trả lại hợp đồng');
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Trả lại thất bại', 'error');
        } finally { setBusy(null); }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            ACTIVE: 'bg-green-100 text-green-800',
            PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
            REJECTED: 'bg-red-100 text-red-800',
            EXPIRED: 'bg-gray-100 text-gray-600',
            TERMINATED: 'bg-red-100 text-red-800',
        };
        const labels: Record<string, string> = {
            PENDING_APPROVAL: 'Chờ duyệt', ACTIVE: 'Hiệu lực', REJECTED: 'Bị từ chối', EXPIRED: 'Hết hạn',
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const filtered = contracts.filter(c =>
        (c.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.contractType || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">Contracts</h1>
                    <p className="text-sm text-gray-500">HR / Contracts</p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        New Contract
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4">
                <button
                    onClick={() => { setActiveTab('all'); setPage(0); }}
                    className={`px-4 py-2 text-sm rounded-md font-medium transition-colors
                        ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>
                    All Contracts
                </button>
                <button
                    onClick={() => { setActiveTab('expiring'); setPage(0); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md font-medium transition-colors
                        ${activeTab === 'expiring' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-300 hover:bg-amber-50'}`}>
                    <AlertTriangleIcon className="w-3.5 h-3.5" /> Expiring in 30 Days
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {activeTab === 'expiring' ? 'Expiring Contracts (next 30 days)' : 'All Contracts'}
                    </h2>
                    <div className="w-64">
                        <input
                            type="text"
                            placeholder="Search by employee or type..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngạch/Bậc</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                                    {(canWrite || isDirector) && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={(canWrite || isDirector) ? 8 : 7} className="px-6 py-8 text-center text-gray-400">No contracts found</td></tr>
                                ) : filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <button onClick={() => setDetailItem(c)}
                                                className="text-blue-700 hover:text-blue-900 hover:underline text-left">
                                                {c.employeeName || c.employeeId}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{c.contractType}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{c.startDate || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{c.endDate || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{c.positionCode ? `${c.positionCode} / Bậc ${c.salaryStep ?? '—'}` : (c.salaryRank ?? '—')}</td>
                                        <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => setDocTarget(c)}
                                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                                                    c.hasDocument ? 'text-green-700 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-50'
                                                }`} title={c.hasDocument ? 'Xem tài liệu' : 'Đính kèm tài liệu'}>
                                                <PaperclipIcon className="w-4 h-4" />
                                                {c.hasDocument ? 'Xem' : 'Đính kèm'}
                                            </button>
                                        </td>
                                        {(canWrite || isDirector) && (
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex items-center space-x-2">
                                                    {canWrite && (
                                                        <>
                                                            <button onClick={() => setEditTarget(c)}
                                                                className="p-1 text-gray-600 hover:text-blue-600" title="Sửa (tạo bản chờ duyệt)">
                                                                <Edit2Icon className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setDeleteConfirm(c.id)}
                                                                className="p-1 text-gray-600 hover:text-red-600" title="Xóa">
                                                                <Trash2Icon className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {isDirector && c.status === 'PENDING_APPROVAL' && (
                                                        <>
                                                            <button disabled={busy === c.id} onClick={() => handleApprove(c.id)}
                                                                className="p-1 text-gray-600 hover:text-green-600 disabled:opacity-40" title="Duyệt & kích hoạt">
                                                                <CheckCircleIcon className="w-4 h-4" />
                                                            </button>
                                                            <button disabled={busy === c.id} onClick={() => handleReject(c.id)}
                                                                className="p-1 text-gray-600 hover:text-red-600 disabled:opacity-40" title="Trả lại">
                                                                <XCircleIcon className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'all' && totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-100">
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>

            <ContractFormModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={fetchData}
                contract={null}
                employees={employees}
            />
            <ContractFormModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={fetchData}
                contract={editTarget}
                employees={employees}
            />

            <ContractDocumentModal
                contract={docTarget}
                canUpload={canWrite}
                onClose={() => setDocTarget(null)}
                onUploaded={fetchData}
            />

            <ContractDetailModal
                contract={detailItem}
                onClose={() => setDetailItem(null)}
                onAttach={(c) => { setDetailItem(null); setDocTarget(c); }}
            />

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Contract</h3>
                        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this contract?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
