const API_URL = import.meta.env.VITE_API_GATEWAY_URL || '/api';
const API_KEY = import.meta.env.VITE_GATEWAY_KEY || '';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (API_KEY) {
    headers.set('x-api-key', API_KEY);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers
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
    })
};
