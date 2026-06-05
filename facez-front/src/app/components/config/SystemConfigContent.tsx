"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircleIcon, ChevronDownIcon, ChevronRightIcon, EditIcon, PlayIcon, Trash2Icon } from 'lucide-react';
import {
    getSystemConfigs,
    createSystemConfig,
    activateSystemConfig,
    deleteSystemConfig,
} from '@/app/services/SystemConfigService';
import { Modal } from '@/app/components/common/Modal';
import { useToast } from '@/app/commons/contexts/ToastContext';
import { useAuth } from '@/app/commons/contexts/AuthContext';
import type { ConfigType, SystemConfig, SystemConfigCreateRequest } from '@/app/commons/types';

const CONFIG_TYPES: ConfigType[] = ['SALARY_GRADE', 'ALLOWANCE', 'PIT', 'INSURANCE'];

const CONFIG_LABELS: Record<ConfigType, string> = {
    SALARY_GRADE: 'Salary Grade',
    ALLOWANCE: 'Allowance',
    PIT: 'Personal Income Tax',
    INSURANCE: 'Insurance',
};

// ─── New Version Modal ────────────────────────────────────────────────────────

interface VersionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    configType: ConfigType;
    prefill?: SystemConfig | null;
}

function VersionModal({ isOpen, onClose, onSuccess, configType, prefill }: VersionModalProps) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        version: '',
        effectiveDate: '',
        legalBasis: '',
        configDataText: '',
    });
    const [jsonError, setJsonError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setForm({
                version: prefill ? `${prefill.version}-v2` : '',
                effectiveDate: prefill?.effectiveDate ?? '',
                legalBasis: prefill?.legalBasis ?? '',
                configDataText: prefill ? JSON.stringify(prefill.configData, null, 2) : '',
            });
            setJsonError(null);
        }
    }, [isOpen, prefill]);

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    const handleConfigDataChange = (value: string) => {
        set('configDataText', value);
        try {
            JSON.parse(value);
            setJsonError(null);
        } catch {
            setJsonError('Invalid JSON');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.version.trim()) return;
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(form.configDataText);
        } catch {
            setJsonError('Invalid JSON — fix before saving');
            return;
        }

        const body: SystemConfigCreateRequest = {
            configType,
            version: form.version.trim(),
            configData: parsed,
        };
        if (form.effectiveDate) body.effectiveDate = form.effectiveDate;
        if (form.legalBasis.trim()) body.legalBasis = form.legalBasis.trim();

        setSaving(true);
        try {
            await createSystemConfig(body);
            showToast('Config version created');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to create config', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`New Version — ${CONFIG_LABELS[configType]}`} width="max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Version label <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.version}
                            onChange={e => set('version', e.target.value)}
                            placeholder="e.g. 2026-v2"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Effective date</label>
                        <input
                            type="date"
                            value={form.effectiveDate}
                            onChange={e => set('effectiveDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Legal basis</label>
                        <input
                            type="text"
                            value={form.legalBasis}
                            onChange={e => set('legalBasis', e.target.value)}
                            placeholder="e.g. Salary Regulation v4.1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Config data (JSON) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={form.configDataText}
                        onChange={e => handleConfigDataChange(e.target.value)}
                        rows={16}
                        spellCheck={false}
                        className={`w-full px-3 py-2 border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y
                            ${jsonError ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="{}"
                    />
                    {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving || !!jsonError}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Create version'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Config Table ─────────────────────────────────────────────────────────────

interface ConfigTableProps {
    configType: ConfigType;
    refreshKey: number;
    onEdit: (config: SystemConfig) => void;
}

function ConfigTable({ configType, refreshKey, onEdit }: ConfigTableProps) {
    const { showToast } = useToast();
    const { role } = useAuth();
    const canActivate = role !== 'FINANCE_ADMIN';
    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [activating, setActivating] = useState<string | null>(null);

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getSystemConfigs(configType);
            if (res.success) setConfigs(res.data ?? []);
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load configs');
        } finally {
            setLoading(false);
        }
    }, [configType, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    const handleActivate = async (id: string) => {
        setActivating(id);
        try {
            await activateSystemConfig(id);
            showToast('Config activated and payroll cache reloaded');
            fetchConfigs();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to activate', 'error');
        } finally {
            setActivating(null);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteSystemConfig(id);
            showToast('Config version deleted');
            setDeleteConfirm(null);
            if (expandedId === id) setExpandedId(null);
            fetchConfigs();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
            setDeleteConfirm(null);
        }
    };

    const toggleExpand = (id: string) =>
        setExpandedId(prev => (prev === id ? null : id));

    if (loading) return <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>;
    if (error) return <div className="p-6 text-center text-red-500 text-sm">{error}</div>;
    if (configs.length === 0) return (
        <div className="p-10 text-center text-gray-400 text-sm">
            No versions yet. Click <strong>+ New Version</strong> to create one.
        </div>
    );

    return (
        <>
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="w-8 px-3 py-3" />
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Legal basis</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated by</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created at</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {configs.map(cfg => (
                        <React.Fragment key={cfg.id}>
                            {/* Main row */}
                            <tr
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => toggleExpand(cfg.id)}
                            >
                                <td className="px-3 py-3 text-gray-400">
                                    {expandedId === cfg.id
                                        ? <ChevronDownIcon className="w-4 h-4" />
                                        : <ChevronRightIcon className="w-4 h-4" />}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{cfg.version}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{cfg.effectiveDate ?? '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={cfg.legalBasis ?? ''}>
                                    {cfg.legalBasis ?? '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {cfg.active
                                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                            <CheckCircleIcon className="w-3 h-3" /> Active
                                        </span>
                                        : <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Inactive</span>
                                    }
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{cfg.updatedBy}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {new Date(cfg.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onEdit(cfg)}
                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="New version based on this"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        {!cfg.active && (
                                            <>
                                                {canActivate && (
                                                    <button
                                                        onClick={() => handleActivate(cfg.id)}
                                                        disabled={activating === cfg.id}
                                                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
                                                        title="Activate this version"
                                                    >
                                                        <PlayIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setDeleteConfirm(cfg.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>

                            {/* Expanded detail row */}
                            {expandedId === cfg.id && (
                                <tr className="bg-gray-50">
                                    <td />
                                    <td colSpan={7} className="px-4 py-4">
                                        <div className="grid grid-cols-2 gap-6 mb-4 text-sm">
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Version</span>
                                                <p className="mt-0.5 text-gray-800 font-medium">{cfg.version}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Effective date</span>
                                                <p className="mt-0.5 text-gray-800">{cfg.effectiveDate ?? '—'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Legal basis</span>
                                                <p className="mt-0.5 text-gray-800">{cfg.legalBasis ?? '—'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Last updated</span>
                                                <p className="mt-0.5 text-gray-800">
                                                    {new Date(cfg.updatedAt).toLocaleString('vi-VN')} by {cfg.updatedBy}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-400 uppercase block mb-2">Config data</span>
                                            <pre className="bg-white border border-gray-200 rounded-md p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed text-black">
                                                {JSON.stringify(cfg.configData, null, 2)}
                                            </pre>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            {/* Delete confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete config version?</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Only inactive versions can be deleted. This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

export function SystemConfigContent() {
    const [activeTab, setActiveTab] = useState<ConfigType>('SALARY_GRADE');
    const [refreshKey, setRefreshKey] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [prefill, setPrefill] = useState<SystemConfig | null>(null);

    const openNewVersion = (config?: SystemConfig) => {
        setPrefill(config ?? null);
        setShowModal(true);
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2">System Config</h1>
                    <p className="text-sm text-gray-500">System / Payroll configuration versions</p>
                </div>
                <button
                    onClick={() => openNewVersion()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                    + New Version
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-200">
                {CONFIG_TYPES.map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors
                            ${activeTab === type
                                ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px'
                                : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {CONFIG_LABELS[type]}
                    </button>
                ))}
            </div>

            {/* Table card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <ConfigTable
                        key={activeTab}
                        configType={activeTab}
                        refreshKey={refreshKey}
                        onEdit={cfg => openNewVersion(cfg)}
                    />
                </div>
            </div>

            <VersionModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={() => setRefreshKey(k => k + 1)}
                configType={activeTab}
                prefill={prefill}
            />
        </div>
    );
}
