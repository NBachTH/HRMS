"use client";

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, XIcon } from 'lucide-react';

type ToastType = 'success' | 'error';

interface Toast {
    id: number;
    type: ToastType;
    message: string;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast container */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm
                            ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
                    >
                        {toast.type === 'success'
                            ? <CheckCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                            : <XCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />}
                        <span className="flex-1">{toast.message}</span>
                        <button onClick={() => dismiss(toast.id)} className="shrink-0 opacity-70 hover:opacity-100">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
