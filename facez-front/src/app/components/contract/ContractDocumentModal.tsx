"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Modal } from '@/app/components/common/Modal';
import { getContractDocumentUrl, uploadContractDocument } from '@/app/services/ContractService';
import { useToast } from '@/app/commons/contexts/ToastContext';
import type { Contract } from '@/app/commons/types';

interface Props {
    contract: Contract | null;
    canUpload: boolean;
    onClose: () => void;
    onUploaded: () => void;
}

export function ContractDocumentModal({ contract, canUpload, onClose, onUploaded }: Props) {
    const { showToast } = useToast();
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchUrl = useCallback(async () => {
        if (!contract?.hasDocument) { setUrl(null); return; }
        setLoading(true);
        try {
            const res = await getContractDocumentUrl(contract.id);
            setUrl(res.data?.url ?? null);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được tài liệu', 'error');
            setUrl(null);
        } finally {
            setLoading(false);
        }
    }, [contract, showToast]);

    useEffect(() => { if (contract) fetchUrl(); }, [contract, fetchUrl]);

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !contract) return;
        if (file.type !== 'application/pdf') { showToast('Chỉ chấp nhận file PDF', 'error'); return; }
        setUploading(true);
        try {
            await uploadContractDocument(contract.id, file);
            showToast('Đã tải tài liệu hợp đồng');
            onUploaded();
            // refetch url after a short delay so the new doc shows
            const res = await getContractDocumentUrl(contract.id);
            setUrl(res.data?.url ?? null);
        } catch (err: any) {
            showToast(err?.body?.message || 'Tải lên thất bại', 'error');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <Modal isOpen={!!contract} onClose={onClose}
            title={`Hợp đồng — ${contract?.employeeName || contract?.employeeId || ''}`} width="max-w-4xl">
            {loading ? (
                <div className="py-16 text-center text-gray-500">Đang tải…</div>
            ) : url ? (
                <div className="space-y-3">
                    <iframe src={url} title="Contract PDF" className="w-full h-[70vh] border border-gray-200 rounded-md" />
                    <div className="flex items-center justify-between">
                        <a href={url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                            <FileText className="w-4 h-4" /> Mở tab mới
                        </a>
                        {canUpload && (
                            <label className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                                <UploadCloud className="w-4 h-4" /> {uploading ? 'Đang tải…' : 'Thay tài liệu'}
                                <input type="file" accept="application/pdf" className="hidden" onChange={onFile} disabled={uploading} />
                            </label>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-4">Hợp đồng chưa có tài liệu đính kèm.</p>
                    {canUpload ? (
                        <label className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                            <UploadCloud className="w-4 h-4" /> {uploading ? 'Đang tải…' : 'Tải lên PDF'}
                            <input type="file" accept="application/pdf" className="hidden" onChange={onFile} disabled={uploading} />
                        </label>
                    ) : (
                        <p className="text-xs text-gray-400">Liên hệ HR để bổ sung tài liệu.</p>
                    )}
                </div>
            )}
        </Modal>
    );
}
