const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function getBackendUrl() {
    return BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:8003';
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user_id: string;
    email: string;
}

export interface UserMe {
    id: string;
    supabase_user_id: string;
    email: string;
    created_at: string;
}

export async function authRegister(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${getBackendUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Registration failed');
    }
    return res.json() as Promise<AuthResponse>;
}

export async function authLogin(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${getBackendUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Login failed');
    }
    return res.json() as Promise<AuthResponse>;
}

export async function authRefresh(refreshToken: string): Promise<AuthResponse> {
    const res = await fetch(`${getBackendUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error('Token refresh failed');
    return res.json() as Promise<AuthResponse>;
}

export async function authLogout(accessToken: string): Promise<void> {
    await fetch(`${getBackendUrl()}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function authMe(accessToken: string): Promise<UserMe> {
    const res = await fetch(`${getBackendUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json() as Promise<UserMe>;
}
