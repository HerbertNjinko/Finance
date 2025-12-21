const API_URL = import.meta.env.VITE_API_GATEWAY_URL || '/api';
const TOKEN_KEY = 'regulator_portal_auth';

function toQuery(params?: Record<string, string | number | undefined>) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '';
  const query = new URLSearchParams();
  for (const [key, value] of entries) {
    query.append(key, String(value));
  }
  return `?${query.toString()}`;
}

function authHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  const tokenRaw = localStorage.getItem(TOKEN_KEY);
  if (tokenRaw) {
    try {
      const parsed = JSON.parse(tokenRaw);
      if (parsed?.accessToken) {
        headers.set('Authorization', `Bearer ${parsed.accessToken}`);
      }
    } catch {
      // ignore
    }
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: authHeaders(init)
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export const api = {
  listObligations: () => request('/obligations'),
  listDisputes: () => request('/disputes'),
  listInstitutions: () => request('/institutions'),
  listRepayments: (params?: Record<string, string | number | undefined>) =>
    request(`/repayments${toQuery(params)}`),
  createInstitution: (payload: Record<string, unknown>) =>
    request('/institutions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateInstitution: (institutionId: string, payload: Record<string, unknown>) =>
    request(`/institutions/${institutionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  deleteInstitution: (institutionId: string) =>
    request(`/institutions/${institutionId}`, {
      method: 'DELETE'
    }),
  listUsers: (params?: Record<string, string | number | undefined>) =>
    request(`/auth/users${toQuery(params)}`),
  inviteUser: (payload: Record<string, unknown>) =>
    request('/auth/invitations', { method: 'POST', body: JSON.stringify(payload) }),
  updateUserStatus: (userId: string, payload: Record<string, unknown>) =>
    request(`/auth/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) })
};
