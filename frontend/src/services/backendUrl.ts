const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalHttpUrl(value: string): boolean {
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return isLocalHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function getBackendUrl(): string {
  const backendFromEnv = RAW_BACKEND_URL?.trim();
  if (backendFromEnv) {
    const normalized = trimTrailingSlashes(backendFromEnv);
    if (!import.meta.env.DEV && isLocalHttpUrl(normalized)) {
      return '/api';
    }
    return normalized;
  }

  return import.meta.env.DEV ? 'http://localhost:8003' : '/api';
}
