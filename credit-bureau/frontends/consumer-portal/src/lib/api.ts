const API_URL = import.meta.env.VITE_API_GATEWAY_URL || '/api';
const CONSUMER_ENTITY_ID = import.meta.env.VITE_CONSUMER_ENTITY_ID || '';

function withEntity(query?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  if (CONSUMER_ENTITY_ID) params.set('entityId', CONSUMER_ENTITY_ID);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = {
  getScore: (entityId?: string) => request(`/scores/${entityId || CONSUMER_ENTITY_ID}`),
  listObligations: (query?: Record<string, string | number | undefined>) => request(`/obligations${withEntity(query)}`),
  listRepayments: (query?: Record<string, string | number | undefined>) => request(`/repayments${withEntity(query)}`),
  listDisputes: () => request(`/disputes${withEntity()}`),
  createDispute: (payload: Record<string, unknown>) =>
    request('/disputes', {
      method: 'POST',
      body: JSON.stringify({ ...payload, entityId: CONSUMER_ENTITY_ID })
    })
};
