"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { setAccessToken as setGlobalToken, onTokenRefresh } from "../utils/ApiCallUtil";
import { refresh as refreshAuth, signout as authSignout } from "../../services/AuthService";

type User = { username: string; role: string; employeeId?: string } | null;

interface AuthContextType {
    user: User;
    accessToken: string | null;
    role: string | null;
    employeeId: string | null;
    isLoading: boolean;
    setAccessToken: (token: string | null) => void;
    setUser: (user: User) => void;
    setRole: (role: string | null) => void;
    setEmployeeId: (employeeId: string | null) => void;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    accessToken: null,
    role: null,
    employeeId: null,
    isLoading: true,
    setAccessToken: () => { },
    setUser: () => { },
    setRole: () => { },
    setEmployeeId: () => { },
    logout: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>(null);
    const [accessToken, setAccessTokenState] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const setAccessToken = useCallback((token: string | null) => {
        setAccessTokenState(token);
        setGlobalToken(token);
    }, []);

    const logout = useCallback(async () => {
        try {
            await authSignout();
        } catch {
            // ignore
        }
        setAccessToken(null);
        setUser(null);
        setRole(null);
        setEmployeeId(null);
    }, [setAccessToken]);

    // Try to restore session via refresh token on mount
    useEffect(() => {
        async function tryRestore() {
            try {
                const data = await refreshAuth();
                setAccessToken(data.accessToken);
                setUser({ username: data.username, role: data.role, employeeId: data.employeeId });
                setRole(data.role);
                setEmployeeId(data.employeeId);
            } catch {
                // not logged in — that's ok
            } finally {
                setIsLoading(false);
            }
        }
        tryRestore();
    }, [setAccessToken]);

    // Sync when apiClient does a silent refresh
    useEffect(() => {
        onTokenRefresh((newToken) => {
            setAccessTokenState(newToken);
        });
    }, []);

    return (
        <AuthContext.Provider value={{ user, accessToken, role, employeeId, isLoading, setAccessToken, setUser, setRole, setEmployeeId, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
