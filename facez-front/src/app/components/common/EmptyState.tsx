"use client";
import React from 'react';
import { InboxIcon } from 'lucide-react';

interface Props {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: Props) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 text-gray-300">
                {icon ?? <InboxIcon className="w-12 h-12" />}
            </div>
            <h3 className="text-base font-medium text-gray-600">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-400 max-w-xs">{description}</p>}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
