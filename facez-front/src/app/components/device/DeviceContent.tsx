"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { MonitorIcon, KeyIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { getDevices, createDevice, deleteDevice, createApiKey, deactivateApiKey } from '@/app/services/DeviceService';
import { Modal } from '@/app/components/common/Modal';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Device, ApiKeyCreateResponse } from '@/app/commons/types';

// ── Create Device Modal ───────────────────────────────────────────────────────
function DeviceFormModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ deviceName: '', location: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => { if (isOpen) { setForm({ deviceName: '', location: '' }); setErrors({}); } }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!form.deviceName.trim()) errs.deviceName = 'Required';
        if (!form.location.trim()) errs.location = 'Required';
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        try {
            await createDevice(form);
            showToast('Device created');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to create device', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Device" width="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Name <span className="text-red-500">*</span></label>
                    <input value={form.deviceName} onChange={e => setForm(f => ({ ...f, deviceName: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.deviceName ? 'border-red-400' : 'border-gray-300'}`} />
                    {errors.deviceName && <p className="text-xs text-red-500 mt-1">{errors.deviceName}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="e.g. Main entrance, Floor 2"
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.location ? 'border-red-400' : 'border-gray-300'}`} />
                    {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Creating…' : 'Create Device'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── API Key reveal Modal ──────────────────────────────────────────────────────
function ApiKeyRevealModal({ isOpen, onClose, apiKey }: { isOpen: boolean; onClose: () => void; apiKey: ApiKeyCreateResponse | null }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (apiKey?.rawKey) {
            navigator.clipboard.writeText(apiKey.rawKey).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="API Key Created" width="max-w-lg">
            <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                    <strong>Important:</strong> Copy this key now. It will never be shown again.
                </div>
                {apiKey && (
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Raw API Key</label>
                        <div className="flex gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-100 rounded-md text-sm font-mono break-all border border-gray-200">
                                {apiKey.rawKey}
                            </code>
                            <button onClick={handleCopy}
                                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0">
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Key ID: {apiKey.keyId}</p>
                    </div>
                )}
                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-900">
                        I have saved the key
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function DeviceContent() {
    const { showToast } = useToast();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newApiKey, setNewApiKey] = useState<ApiKeyCreateResponse | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [generatingKeyFor, setGeneratingKeyFor] = useState<string | null>(null);

    const fetchDevices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getDevices();
            if (res.success && res.data) setDevices(res.data);
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load devices');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDevices(); }, [fetchDevices]);

    const handleDelete = async (id: string) => {
        try {
            await deleteDevice(id);
            showToast('Device deleted');
            setDeleteConfirm(null);
            fetchDevices();
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to delete', 'error');
        }
    };

    const handleCreateApiKey = async (deviceId: string) => {
        setGeneratingKeyFor(deviceId);
        try {
            const res = await createApiKey(deviceId);
            if (res.success && res.data) {
                setNewApiKey(res.data);
                fetchDevices();
            }
        } catch (err: any) {
            showToast(err?.body?.message || 'Failed to create API key', 'error');
        } finally {
            setGeneratingKeyFor(null);
        }
    };

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <MonitorIcon className="w-7 h-7" /> Checkin Devices
                    </h1>
                    <p className="text-sm text-gray-500">Manage attendance devices and API keys</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                    <PlusIcon className="w-4 h-4" /> Add Device
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading…</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {devices.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No devices registered</td></tr>
                                ) : devices.map(device => (
                                    <tr key={device.deviceId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{device.deviceName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{device.location}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${device.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {device.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${device.apiKeyActive ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {device.apiKeyActive ? 'Key active' : 'No active key'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleCreateApiKey(device.deviceId)}
                                                    disabled={generatingKeyFor === device.deviceId}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 disabled:opacity-50"
                                                    title="Generate new API key">
                                                    <KeyIcon className="w-3 h-3" />
                                                    {generatingKeyFor === device.deviceId ? 'Generating…' : 'New Key'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(device.deviceId)}
                                                    className="p-1 text-gray-500 hover:text-red-600" title="Delete device">
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <DeviceFormModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchDevices} />

            <ApiKeyRevealModal isOpen={!!newApiKey} onClose={() => setNewApiKey(null)} apiKey={newApiKey} />

            <ConfirmDialog
                open={!!deleteConfirm}
                title="Delete Device"
                message="Are you sure you want to delete this device? All associated API keys will be revoked."
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                onCancel={() => setDeleteConfirm(null)}
                danger
            />
        </div>
    );
}
