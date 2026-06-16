"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { KeyRoundIcon, PowerIcon } from 'lucide-react';
import { getAccounts, toggleAccount, resetAccountPassword, type Account } from '@/app/services/AccountService';
import { Pagination } from '@/app/components/common/Pagination';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { useToast } from '@/app/commons/contexts/ToastContext';

export function AccountManagerContent() {
    const { showToast } = useToast();
    const [rows, setRows] = useState<Account[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [resetTarget, setResetTarget] = useState<Account | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAccounts(page, 20);
            const data: any = res.data;
            setRows(data?.content ?? []);
            setTotalPages(data?.totalPages ?? 1);
        } catch (err: any) {
            showToast(err?.body?.message || 'Không tải được danh sách tài khoản', 'error');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [page, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggle = async (a: Account) => {
        setBusy(a.employeeId);
        try {
            await toggleAccount(a.employeeId);
            showToast(a.enabled ? `Đã khóa ${a.username}` : `Đã mở khóa ${a.username}`);
            fetchData();
        } catch (err: any) {
            showToast(err?.body?.message || 'Thao tác thất bại', 'error');
        } finally { setBusy(null); }
    };

    const doReset = async () => {
        if (!resetTarget) return;
        try {
            await resetAccountPassword(resetTarget.employeeId);
            showToast(`Đã reset mật khẩu ${resetTarget.username} về mặc định (Pass@1234)`);
            setResetTarget(null);
        } catch (err: any) {
            showToast(err?.body?.message || 'Reset thất bại', 'error');
        }
    };

    const visible = rows.filter(a =>
        (a.username || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.employeeId || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1">Account Manager</h1>
                    <p className="text-sm text-gray-500">Quản lý tài khoản đăng nhập — khóa/mở khóa & reset mật khẩu</p>
                </div>
                <input type="text" placeholder="Tìm theo username / tên / mã NV…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-72 px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Đang tải…</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Username', 'Nhân viên', 'Phòng ban', 'Vai trò', 'Trạng thái', ''].map(h =>
                                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visible.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Không có tài khoản</td></tr>
                                ) : visible.map(a => (
                                    <tr key={a.employeeId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.username}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{a.employeeName || a.employeeId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{a.departmentName || '—'}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{a.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${a.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {a.enabled ? 'Đang hoạt động' : 'Đã khóa'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button disabled={busy === a.employeeId} onClick={() => toggle(a)}
                                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                                                    a.enabled ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                                                } disabled:opacity-50`}>
                                                <PowerIcon className="w-3.5 h-3.5" /> {a.enabled ? 'Khóa' : 'Mở khóa'}
                                            </button>
                                            <button onClick={() => setResetTarget(a)}
                                                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">
                                                <KeyRoundIcon className="w-3.5 h-3.5" /> Reset MK
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>

            <ConfirmDialog open={!!resetTarget} title="Reset mật khẩu"
                message={`Đặt lại mật khẩu của "${resetTarget?.username}" về mặc định (Pass@1234)?`}
                onConfirm={doReset} onCancel={() => setResetTarget(null)} />
        </div>
    );
}
