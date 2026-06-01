import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authLogin, authLogout, authRegister,  } from '@/services/auth';

const TOKEN_KEY = 'kolenke_access_token';
const REFRESH_KEY = 'kolenke_refresh_token';
const USER_KEY = 'kolenke_user';

interface AuthUser {
    userId: string;
    email: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const fallbackAuthContext: AuthContextValue = {
    user: null,
    loading: false,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
    getToken: () => localStorage.getItem(TOKEN_KEY),
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore session from localStorage
        const token = localStorage.getItem(TOKEN_KEY);
        const stored = localStorage.getItem(USER_KEY);
        if (token && stored) {
            try {
                setUser(JSON.parse(stored));
            } catch {
                localStorage.removeItem(USER_KEY);
            }
        }
        setLoading(false);
    }, []);

    const storeSession = (accessToken: string, refreshToken: string, email: string, userId: string) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_KEY, refreshToken);
        const u: AuthUser = { userId, email };
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setUser(u);
    };

    const clearSession = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    };

    const signIn = useCallback(async (email: string, password: string) => {
        const res = await authLogin(email, password);
        storeSession(res.access_token, res.refresh_token, res.email, res.user_id);
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        const res = await authRegister(email, password);
        storeSession(res.access_token, res.refresh_token, res.email, res.user_id);
    }, []);

    const signOut = useCallback(async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            await authLogout(token).catch(() => {});
        }
        clearSession();
    }, []);

    const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, getToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    return ctx ?? fallbackAuthContext;
}
