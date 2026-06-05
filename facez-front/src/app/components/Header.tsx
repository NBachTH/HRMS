"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    BellIcon, LogOutIcon,
    UserIcon, ChevronDownIcon, CheckCircleIcon, ClockIcon,
    AlertTriangleIcon, InfoIcon, BanknoteIcon, CalendarIcon,
    XIcon, FileTextIcon,
} from 'lucide-react';
import { useAuth } from "@/app/commons/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getNotifications, getUnreadCount, markRead, markAllRead } from '@/app/services/NotificationService';
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

const ROLE_BADGE: Record<string, string> = {
    SYSTEM_ADMIN:  'bg-red-100 text-red-700',
    HR_ADMIN:      'bg-purple-100 text-purple-700',
    MANAGER:       'bg-blue-100 text-blue-700',
    LEADER:        'bg-teal-100 text-teal-700',
    FINANCE_ADMIN: 'bg-emerald-100 text-emerald-700',
    DIRECTOR:      'bg-indigo-100 text-indigo-700',
    EMPLOYEE:      'bg-gray-100 text-gray-600',
};

export function Header() {
    const { user, role, logout } = useAuth();
    const router = useRouter();

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifLoaded, setNotifLoaded] = useState(false);

    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll unread count every 60 seconds
    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await getUnreadCount();
            if (res.success && res.data) setUnreadCount(res.data.unreadCount);
        } catch { /* silent — user might not be logged in yet */ }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        pollRef.current = setInterval(fetchUnreadCount, 60_000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchUnreadCount]);

    // Load notification list lazily on first open
    const loadNotifications = useCallback(async () => {
        try {
            const res = await getNotifications(0, 20);
            if (res.success && res.data) {
                setNotifications(res.data.content);
                setNotifLoaded(true);
            }
        } catch { /* silent */ }
    }, []);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const t = e.target as Node;
            if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Escape closes everything
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setUserMenuOpen(false);
                setNotifOpen(false);
            }
        }
        if (userMenuOpen || notifOpen) {
            document.addEventListener('keydown', handleKey);
            return () => document.removeEventListener('keydown', handleKey);
        }
    }, [userMenuOpen, notifOpen]);

    async function handleLogout() {
        setUserMenuOpen(false);
        await logout();
        router.push("/");
    }

    function handleProfile() {
        setUserMenuOpen(false);
        router.push("/employees/me");
    }

    const toggleNotif = useCallback(() => {
        setNotifOpen(o => {
            const next = !o;
            if (next && !notifLoaded) loadNotifications();
            return next;
        });
        setUserMenuOpen(false);
    }, [notifLoaded, loadNotifications]);

    const toggleUserMenu = useCallback(() => {
        setUserMenuOpen(o => !o);
        setNotifOpen(false);
    }, []);

    async function handleMarkRead(id: string) {
        setNotifications(prev => prev.map(n => n.notificationId === id ? { ...n, read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
        try { await markRead(id); } catch { /* revert on failure is tricky; silent */ }
    }

    async function handleMarkAllRead() {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        try { await markAllRead(); } catch { /* silent */ }
    }

    function dismissNotification(id: string) {
        const n = notifications.find(n => n.notificationId === id);
        if (n && !n.read) setUnreadCount(c => Math.max(0, c - 1));
        setNotifications(prev => prev.filter(n => n.notificationId !== id));
    }

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Search placeholder */}
                <div className="flex-1 max-w-xl">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4 ml-4">

                    {/* Notification bell */}
                    <div className="relative" ref={notifRef}>
                        <button
                            id="notif-button"
                            onClick={toggleNotif}
                            className={`relative p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200
                                ${notifOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                            aria-expanded={notifOpen}
                            aria-haspopup="true"
                            aria-label="Notifications"
                        >
                            <BellIcon className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {notifOpen && (
                            <div
                                className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
                                role="menu"
                                aria-labelledby="notif-button"
                            >
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
                                    {notifications.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <BellIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400">No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map(n => {
                                            const style = NOTIF_ICON[n.type?.toUpperCase()] || NOTIF_ICON.INFO;
                                            return (
                                                <div
                                                    key={n.notificationId}
                                                    className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                                                        ${n.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70'}`}
                                                    onClick={() => !n.read && handleMarkRead(n.notificationId)}
                                                    role="menuitem"
                                                >
                                                    <div className={`flex-none w-8 h-8 rounded-full ${style.bg} flex items-center justify-center mt-0.5`}>
                                                        {style.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-sm truncate ${n.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                                                                {n.title}
                                                            </p>
                                                            {!n.read && <span className="flex-none w-2 h-2 bg-blue-500 rounded-full" />}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                                            <ClockIcon className="w-3 h-3" />
                                                            {relativeTime(n.createdAt)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); dismissNotification(n.notificationId); }}
                                                        className="flex-none opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 transition-all"
                                                        aria-label="Dismiss notification"
                                                    >
                                                        <XIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {notifications.length > 0 && (
                                    <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                                        <button
                                            onClick={() => { setNotifOpen(false); loadNotifications(); }}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User dropdown */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            id="user-menu-button"
                            onClick={toggleUserMenu}
                            className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200"
                            aria-expanded={userMenuOpen}
                            aria-haspopup="true"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                                {user?.username?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-medium text-gray-700 leading-tight">
                                    {user?.username || 'Guest'}
                                </span>
                                <span className="text-xs text-gray-400 leading-tight">{role || ''}</span>
                            </div>
                            <ChevronDownIcon
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {userMenuOpen && (
                            <div
                                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50"
                                role="menu"
                                aria-labelledby="user-menu-button"
                            >
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-base font-semibold shadow-sm">
                                            {user?.username?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {user?.username || 'Guest'}
                                            </p>
                                            <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium rounded-full ${ROLE_BADGE[role || ''] || 'bg-gray-100 text-gray-600'}`}>
                                                {role || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="py-1">
                                    <button
                                        onClick={handleProfile}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        role="menuitem"
                                    >
                                        <UserIcon className="w-4 h-4 text-gray-400" />
                                        <span>My Profile</span>
                                    </button>
                                </div>

                                <div className="border-t border-gray-100 py-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        role="menuitem"
                                    >
                                        <LogOutIcon className="w-4 h-4" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
