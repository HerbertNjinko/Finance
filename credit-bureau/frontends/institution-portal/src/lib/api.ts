const API_URL = import.meta.env.VITE_API_GATEWAY_URL || '/api';

function authHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem('institution_portal_auth');
  if (token) {
    try {
      const parsed = JSON.parse(token);
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
  return response.json();
}

export const api = {
  listObligations: () => request('/obligations'),
  listDisputes: () => request('/disputes')
};
