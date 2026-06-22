"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircleIcon, PlayIcon, Trash2Icon, CopyIcon, PencilIcon, SendIcon, ClockIcon, XCircleIcon } from 'lucide-react';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import { Modal } from '@/app/components/common/Modal';
import type {
    ConfigType,
    SalaryGradeConfig, PitConfig, InsuranceConfig, AllowanceConfig,
} from '@/app/commons/types';
import {
    listSalaryGradeConfigs, createSalaryGradeConfig, updateSalaryGradeConfig, submitSalaryGradeConfig, rejectSalaryGradeConfig, publishSalaryGradeConfig, deleteSalaryGradeConfig,
    listPitConfigs, createPitConfig, updatePitConfig, submitPitConfig, rejectPitConfig, publishPitConfig, deletePitConfig,
    listInsuranceConfigs, createInsuranceConfig, updateInsuranceConfig, submitInsuranceConfig, rejectInsuranceConfig, publishInsuranceConfig, deleteInsuranceConfig,
    listAllowanceConfigs, createAllowanceConfig, updateAllowanceConfig, submitAllowanceConfig, rejectAllowanceConfig, publishAllowanceConfig, deleteAllowanceConfig,
} from '@/app/services/PayrollConfigService';
import { SalaryGradeEditor } from './editors/SalaryGradeEditor';
import { PitEditor } from './editors/PitEditor';
import { InsuranceEditor } from './editors/InsuranceEditor';
import { AllowanceEditor } from './editors/AllowanceEditor';
import { ConfigDetail } from './editors/ConfigDetail';

const CONFIG_TYPES: ConfigType[] = ['SALARY_GRADE', 'ALLOWANCE', 'PIT', 'INSURANCE'];
const CONFIG_LABELS: Record<ConfigType, string> = {
    SALARY_GRADE: 'Salary Grade',
    ALLOWANCE: 'Allowance',
    PIT: 'Personal Income Tax',
    INSURANCE: 'Insurance',
};

type AnyConfig = SalaryGradeConfig | PitConfig | InsuranceConfig | AllowanceConfig;

// Per-type list/summary adapters (mutations are dispatched in the component).
const ADAPTERS: Record<ConfigType, {
    list: () => Promise<{ success: boolean; data: AnyConfig[] | null }>;
    summary: (c: AnyConfig) => string;
}> = {
    SALARY_GRADE: {
        list: listSalaryGradeConfigs as any,
        summary: (c) => `${(c as SalaryGradeConfig).grades?.length ?? 0} grades`,
    },
    PIT: {
        list: listPitConfigs as any,
        summary: (c) => `${(c as PitConfig).brackets?.length ?? 0} brackets · relief ${(c as PitConfig).personalRelief?.toLocaleString('vi-VN')}₫`,
    },
    INSURANCE: {
        list: listInsuranceConfigs as any,
        summary: (c) => {
            const i = c as InsuranceConfig;
            const ee = ((i.eeBhxh + i.eeBhyt + i.eeBhtn) * 100).toFixed(2);
            return `EE ${ee}% · ceiling ${i.insuranceCeiling?.toLocaleString('vi-VN') ?? '—'}₫`;
        },
    },
    ALLOWANCE: {
        list: listAllowanceConfigs as any,
        summary: (c) => `${(c as AllowanceConfig).levels?.length ?? 0} living levels · ${(c as AllowanceConfig).japaneseLevels?.length ?? 0} JLPT`,
    },
};

function StatusBadge({ status }: { status: string }) {
    if (status === 'PUBLISHED')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircleIcon className="w-3 h-3" /> Published</span>;
    if (status === 'ARCHIVED')
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Archived</span>;
    if (status === 'PENDING_APPROVAL')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
            <ClockIcon className="w-3 h-3" /> Chờ duyệt</span>;
    return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Draft</span>;
}

export function SystemConfigContent() {
    const { role } = useAuth();
    const { showToast } = useToast();
    // Maker-checker: FINANCE creates/deletes drafts; DIRECTOR publishes.
    const canCreate = role === 'FINANCE_ADMIN';
    const canPublish = role === 'DIRECTOR';

    const [activeTab, setActiveTab] = useState<ConfigType>('SALARY_GRADE');
    const [items, setItems] = useState<AnyConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [prefill, setPrefill] = useState<AnyConfig | null>(null);
    const [editId, setEditId] = useState<string | null>(null); // null = create mode; set = editing this draft
    const [saving, setSaving] = useState(false);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [detailItem, setDetailItem] = useState<AnyConfig | null>(null);

    const fetchItems = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await ADAPTERS[activeTab].list();
            if (res.success) setItems(res.data ?? []);
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load configs');
        } finally {
            setLoading(false);
        }
    }, [activeTab, refreshKey]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    // Clone = new draft prefilled from an existing version (keeps create mode).
    const openNew = (clone?: AnyConfig) => { setEditId(null); setPrefill(clone ?? null); setModalOpen(true); };
    // Edit = replace the content of an existing DRAFT in place.
    const openEdit = (cfg: AnyConfig) => { setEditId(cfg.id); setPrefill(cfg); setModalOpen(true); };

    const handleSave = async (req: any) => {
        setSaving(true);
        try {
            if (editId) {
                const update = {
                    SALARY_GRADE: updateSalaryGradeConfig,
                    PIT: updatePitConfig,
                    INSURANCE: updateInsuranceConfig,
                    ALLOWANCE: updateAllowanceConfig,
                }[activeTab] as (id: string, b: any) => Promise<any>;
                await update(editId, req);
                showToast('Đã cập nhật bản nháp');
            } else {
                const create = {
                    SALARY_GRADE: createSalaryGradeConfig,
                    PIT: createPitConfig,
                    INSURANCE: createInsuranceConfig,
                    ALLOWANCE: createAllowanceConfig,
                }[activeTab] as (b: any) => Promise<any>;
                await create(req);
                showToast('Draft created');
            }
            setModalOpen(false);
            setEditId(null);
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to save draft', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (id: string) => {
        setSubmittingId(id);
        try {
            const submit = {
                SALARY_GRADE: submitSalaryGradeConfig,
                PIT: submitPitConfig,
                INSURANCE: submitInsuranceConfig,
                ALLOWANCE: submitAllowanceConfig,
            }[activeTab] as (id: string) => Promise<any>;
            await submit(id);
            showToast('Đã trình duyệt — chờ Giám đốc phê duyệt');
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.body?.message || 'Trình duyệt thất bại', 'error');
        } finally {
            setSubmittingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setPublishingId(id);
        try {
            const reject = {
                SALARY_GRADE: rejectSalaryGradeConfig,
                PIT: rejectPitConfig,
                INSURANCE: rejectInsuranceConfig,
                ALLOWANCE: rejectAllowanceConfig,
            }[activeTab] as (id: string) => Promise<any>;
            await reject(id);
            showToast('Đã trả lại bản nháp cho Finance chỉnh sửa');
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.body?.message || 'Trả lại thất bại', 'error');
        } finally {
            setPublishingId(null);
        }
    };

    const handlePublish = async (id: string) => {
        setPublishingId(id);
        try {
            const publish = {
                SALARY_GRADE: publishSalaryGradeConfig,
                PIT: publishPitConfig,
                INSURANCE: publishInsuranceConfig,
                ALLOWANCE: publishAllowanceConfig,
            }[activeTab] as (id: string) => Promise<any>;
            await publish(id);
            showToast('Config published and now live for payroll');
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to publish', 'error');
        } finally {
            setPublishingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const del = {
                SALARY_GRADE: deleteSalaryGradeConfig,
                PIT: deletePitConfig,
                INSURANCE: deleteInsuranceConfig,
                ALLOWANCE: deleteAllowanceConfig,
            }[activeTab] as (id: string) => Promise<any>;
            await del(id);
            showToast('Draft deleted');
            setDeleteId(null);
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
            setDeleteId(null);
        }
    };

    const renderEditor = () => {
        const common = { saving, onSave: handleSave, onCancel: () => { setModalOpen(false); setEditId(null); } };
        switch (activeTab) {
            case 'SALARY_GRADE': return <SalaryGradeEditor initial={prefill as SalaryGradeConfig} {...common} />;
            case 'PIT': return <PitEditor initial={prefill as PitConfig} {...common} />;
            case 'INSURANCE': return <InsuranceEditor initial={prefill as InsuranceConfig} {...common} />;
            case 'ALLOWANCE': return <AllowanceEditor initial={prefill as AllowanceConfig} {...common} />;
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">Payroll Config</h1>
                    <p className="text-sm text-gray-500">Cấu hình lương hiệu lực-theo-ngày. Finance soạn nháp → Submit → Giám đốc duyệt mới có hiệu lực.</p>
                </div>
                {canCreate && (
                    <button onClick={() => openNew()}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                        + New {CONFIG_LABELS[activeTab]}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-200">
                {CONFIG_TYPES.map(type => (
                    <button key={type} onClick={() => setActiveTab(type)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors
                            ${activeTab === type
                                ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px'
                                : 'text-gray-500 hover:text-gray-700'}`}>
                        {CONFIG_LABELS[type]}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500 text-sm">{error}</div>
                ) : items.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-sm">
                        No versions yet.{canCreate && <> Click <strong>+ New {CONFIG_LABELS[activeTab]}</strong> to create one.</>}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective from</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Legal basis</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated by</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map(cfg => (
                                <tr key={cfg.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetailItem(cfg)}>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{cfg.effectiveFrom}</td>
                                    <td className="px-4 py-3"><StatusBadge status={cfg.status} /></td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{ADAPTERS[activeTab].summary(cfg)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={cfg.legalBasis ?? ''}>{cfg.legalBasis ?? '—'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{cfg.updatedBy ?? cfg.createdBy ?? '—'}</td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            {canCreate && (
                                                <button onClick={() => openNew(cfg)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Tạo bản nháp mới từ bản này">
                                                    <CopyIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {cfg.status === 'DRAFT' && canCreate && (
                                                <button onClick={() => openEdit(cfg)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Sửa bản nháp">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {cfg.status === 'DRAFT' && canCreate && (
                                                <button onClick={() => handleSubmit(cfg.id)} disabled={submittingId === cfg.id}
                                                    className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded disabled:opacity-40"
                                                    title="Trình Giám đốc duyệt">
                                                    <SendIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {cfg.status === 'PENDING_APPROVAL' && canPublish && (
                                                <button onClick={() => handlePublish(cfg.id)} disabled={publishingId === cfg.id}
                                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
                                                    title="Duyệt & kích hoạt (go live)">
                                                    <PlayIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {cfg.status === 'PENDING_APPROVAL' && canPublish && (
                                                <button onClick={() => handleReject(cfg.id)} disabled={publishingId === cfg.id}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                                                    title="Trả lại bản nháp">
                                                    <XCircleIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {cfg.status === 'DRAFT' && canCreate && (
                                                <button onClick={() => setDeleteId(cfg.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Xóa bản nháp">
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditId(null); }}
                title={`${editId ? 'Sửa bản nháp' : prefill ? 'New draft (from existing)' : 'New'} — ${CONFIG_LABELS[activeTab]}`} width="max-w-4xl">
                {renderEditor()}
            </Modal>

            <Modal isOpen={detailItem !== null} onClose={() => setDetailItem(null)}
                title={`${CONFIG_LABELS[activeTab]} — ${detailItem?.effectiveFrom ?? ''}`} width="max-w-4xl">
                {detailItem && <ConfigDetail type={activeTab} config={detailItem} />}
            </Modal>

            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete draft?</h3>
                        <p className="text-sm text-gray-600 mb-4">Only draft versions can be deleted. This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
