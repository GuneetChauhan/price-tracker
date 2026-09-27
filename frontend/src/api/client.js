const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),
  listProducts: () => request('/api/products'),
  trackProduct: (payload) =>
    request('/api/products', { method: 'POST', body: JSON.stringify(payload) }),
  untrackProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
  getHistory: (id) => request(`/api/products/${id}/history`),
  getLog: (id) => request(`/api/products/${id}/log`),
  exportCsvUrl: () => `${BASE_URL}/api/export/csv`,
};
