"use client";

import React, { useEffect } from 'react';
import { XIcon } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export function Modal({ isOpen, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            {/* Panel */}
            <div className={`relative bg-white rounded-lg shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
