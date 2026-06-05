"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/commons/contexts/AuthContext";
import { signin } from "@/app/services/AuthService";
import { AlertCircleIcon, LockIcon } from 'lucide-react';

export function LoginForm() {
    const { setAccessToken, setUser, setRole } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [rateLimited, setRateLimited] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Countdown timer for rate limit
    useEffect(() => {
        if (countdown <= 0) { setRateLimited(false); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (rateLimited) return;
        setError(null);
        setLoading(true);
        try {
            const res = await signin({ username, password });
            setAccessToken(res.accessToken);
            setUser({ username: res.username, role: res.role });
            setRole(res.role);
            router.push('/employees/dashboard');
        } catch (err: any) {
            if (err?.status === 429) {
                const retryAfter = err?.body?.retryAfterSeconds || 60;
                setRateLimited(true);
                setCountdown(retryAfter);
                setError(`Too many login attempts. Please wait ${retryAfter} seconds before trying again.`);
            } else {
                const msg = err?.body?.message || err?.body?.data?.message || 'Sign in failed';
                setError(typeof msg === 'string' ? msg : 'Sign in failed');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
            <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <LockIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-sm text-gray-500 mt-1">Sign in to your HRMS account</p>
            </div>

            {error && (
                <div className={`mb-4 p-3 rounded-md text-sm flex items-start gap-2 ${
                    rateLimited ? 'bg-orange-50 border border-orange-200 text-orange-700' :
                    'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    <AlertCircleIcon className="w-4 h-4 flex-none mt-0.5" />
                    <span>
                        {error}
                        {rateLimited && countdown > 0 && (
                            <span className="font-semibold"> ({countdown}s)</span>
                        )}
                    </span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                    </label>
                    <input
                        id="username"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={loading || rateLimited}
                        autoComplete="username"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading || rateLimited}
                        autoComplete="current-password"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || rateLimited}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 font-medium text-sm transition-colors"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Signing in…
                        </span>
                    ) : rateLimited ? `Wait ${countdown}s` : 'Sign in'}
                </button>
            </form>
        </div>
    );
}
