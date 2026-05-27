const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getBackendUrl(): string {
  const backendFromEnv = RAW_BACKEND_URL?.trim();
  if (backendFromEnv) {
    return trimTrailingSlashes(backendFromEnv);
  }

  return import.meta.env.DEV ? 'http://localhost:8003' : '/api';
}
