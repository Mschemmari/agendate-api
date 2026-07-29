const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Error de red');
  }
  return data;
}

export function getPublicProfile(slug) {
  return request(`/public/${slug}`);
}

export function getSlots(slug, from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/public/${slug}/slots?${params}`);
}

export function bookSlot(slug, body) {
  return request(`/public/${slug}/book`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
