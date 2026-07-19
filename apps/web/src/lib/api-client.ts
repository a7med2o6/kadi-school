import { useAuthStore } from '@/stores/auth-store';

/**
 * Tenant resolution mirrors the backend: the API lives on the same subdomain
 * pattern as the web app ({slug}.api-host), so a request made from
 * school-a.localhost:3000 targets school-a.localhost:3001. In production this
 * would sit behind a reverse proxy on one origin instead of two ports.
 */
function getApiBaseUrl(): string {
  const apiHost = process.env.NEXT_PUBLIC_API_HOST ?? 'localhost:3001';
  if (typeof window === 'undefined') {
    return `http://${apiHost}/api/v1`;
  }

  const { hostname, protocol } = window.location;
  const labels = hostname.split('.');
  const isBareHost = labels.length < 2 || labels[0] === 'localhost';
  if (isBareHost) {
    return `${protocol}//${apiHost}/api/v1`;
  }

  const [subdomain] = labels;
  const [apiHostname, apiPort] = apiHost.split(':');
  return `${protocol}//${subdomain}.${apiHostname}${apiPort ? `:${apiPort}` : ''}/api/v1`;
}

export function getApiOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/v1$/, '');
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  // FormData bodies must let the browser set their own multipart boundary — a fixed
  // Content-Type here would break upload parsing on the server.
  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && !isRetry && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, init, true);
    }
    useAuthStore.getState().clear();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }

  if (res.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

const HTTP_NO_CONTENT = 204;

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const { accessToken } = (await res.json()) as { accessToken: string };
    useAuthStore.getState().setAccessToken(accessToken);
    return true;
  } catch {
    return false;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
};

/** Triggers a browser download for an authenticated file endpoint (plain <a href> can't attach a Bearer token). */
export async function downloadAuthenticated(path: string, fallbackFilename: string): Promise<void> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, 'Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
