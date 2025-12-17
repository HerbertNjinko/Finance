const API_URL = import.meta.env.VITE_API_GATEWAY_URL || '/api';

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
  getScore: (entityId: string) => request(`/scores/${entityId}`),
  listDisputes: () => request('/disputes'),
  createDispute: (payload: Record<string, unknown>) =>
    request('/disputes', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
