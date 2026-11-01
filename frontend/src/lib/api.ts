/**
 * API client for communicating with the Devora backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = body.error || body.detail || {};
    throw new ApiError(
      res.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || `Request failed with status ${res.status}`,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Health
  health: () => request<{ status: string; version: string }>('/health'),

  // Auth
  verify: (token: string) =>
    request<{ uid: string; email: string }>('/auth/verify', {}, token),

  // Users
  getProfile: (token: string) =>
    request<Record<string, unknown>>('/users/me', {}, token),
  updateProfile: (token: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/users/me', { method: 'PUT', body: JSON.stringify(data) }, token),

  // Projects
  listProjects: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ projects: Record<string, unknown>[]; total: number; has_more: boolean }>(
      `/projects${qs}`, {}, token,
    );
  },
  createProject: (token: string, data: { name: string; description: string }) =>
    request<Record<string, unknown>>('/projects', { method: 'POST', body: JSON.stringify(data) }, token),
  getProject: (token: string, id: string) =>
    request<Record<string, unknown>>(`/projects/${id}`, {}, token),
  updateProject: (token: string, id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteProject: (token: string, id: string) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }, token),
};

export { ApiError };

