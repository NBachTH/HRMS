"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import {redirect} from "react-router";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[]; // if not provided, any authenticated user can access
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading, role } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        // redirect to login
        redirect("/");
        return null;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-gray-50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-red-600 mb-2">403</h1>
                    <p className="text-gray-600 mb-4">Access Denied</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
