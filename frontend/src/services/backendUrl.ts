const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function getBackendUrl(): string {
  const backendFromEnv = RAW_BACKEND_URL?.trim();
  if (backendFromEnv) {
    return trimTrailingSlashes(backendFromEnv);
  }

  if (typeof window !== 'undefined' && isLocalHostname(window.location.hostname)) {
    return 'http://localhost:8003';
  }

  return '/api';
}
