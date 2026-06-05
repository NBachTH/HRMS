"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
    BellIcon, CheckCircleIcon, AlertTriangleIcon, InfoIcon,
    BanknoteIcon, CalendarIcon, FileTextIcon, CheckIcon,
} from 'lucide-react';
import { getNotifications, markRead, markAllRead } from '@/app/services/NotificationService';
import { Pagination } from '@/app/components/common/Pagination';
import { relativeTime } from '@/app/commons/utils/formatters';
import type { Notification } from '@/app/commons/types';

const NOTIF_ICON: Record<string, { icon: React.ReactNode; bg: string }> = {
    INFO:     { icon: <InfoIcon className="w-4 h-4 text-blue-600" />,           bg: 'bg-blue-100' },
    SUCCESS:  { icon: <CheckCircleIcon className="w-4 h-4 text-green-600" />,   bg: 'bg-green-100' },
    WARNING:  { icon: <AlertTriangleIcon className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-100' },
    LEAVE:    { icon: <CalendarIcon className="w-4 h-4 text-violet-600" />,     bg: 'bg-violet-100' },
    PAYROLL:  { icon: <BanknoteIcon className="w-4 h-4 text-emerald-600" />,    bg: 'bg-emerald-100' },
    CONTRACT: { icon: <FileTextIcon className="w-4 h-4 text-orange-600" />,     bg: 'bg-orange-100' },
};

export function NotificationContent() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filterUnread, setFilterUnread] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getNotifications(page, 20);
            if (res.success && res.data) {
                setNotifications(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err?.body?.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleMarkRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.notificationId === id ? { ...n, read: true } : n));
        try { await markRead(id); } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try { await markAllRead(); fetchData(); } catch { /* silent */ }
    };

    const displayed = filterUnread ? notifications.filter(n => !n.read) : notifications;
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 mb-1 flex items-center gap-2">
                        <BellIcon className="w-7 h-7" /> Notifications
                    </h1>
                    {unreadCount > 0 && (
                        <p className="text-sm text-gray-500">{unreadCount} unread</p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={filterUnread} onChange={e => setFilterUnread(e.target.checked)}
                            className="rounded border-gray-300" />
                        Show unread only
                    </label>
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">
                            <CheckIcon className="w-3 h-3" /> Mark all read
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-500">Loading…</div>
            ) : error ? (
                <div className="py-12 text-center text-red-500">{error}</div>
            ) : (
                <>
                    <div className="space-y-2">
                        {displayed.length === 0 ? (
                            <div className="py-16 text-center">
                                <BellIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400">No notifications</p>
                            </div>
                        ) : displayed.map(n => {
                            const style = NOTIF_ICON[n.type?.toUpperCase()] || NOTIF_ICON.INFO;
                            return (
                                <div key={n.notificationId}
                                    className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors
                                        ${n.read ? 'bg-white border-gray-100 hover:bg-gray-50' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'}`}
                                    onClick={() => !n.read && handleMarkRead(n.notificationId)}>
                                    <div className={`flex-none w-10 h-10 rounded-full ${style.bg} flex items-center justify-center`}>
                                        {style.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className={`text-sm ${n.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                                                {n.title}
                                            </p>
                                            {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-none" />}
                                        </div>
                                        <p className="text-sm text-gray-500">{n.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{relativeTime(n.createdAt)}</p>
                                    </div>
                                    {!n.read && (
                                        <button onClick={e => { e.stopPropagation(); handleMarkRead(n.notificationId); }}
                                            className="flex-none text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {totalPages > 1 && !filterUnread && (
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    )}
                </>
            )}
        </div>
    );
}
