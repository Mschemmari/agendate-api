const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'agendate_pro_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = options.token === null ? null : options.token || getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || (res.status === 404 ? 'No encontrado' : 'Error de red');
    throw new Error(msg);
  }
  return data;
}

export function getPublicProfile(slug) {
  return request(`/public/${slug}`, { token: null });
}

export function getSlots(slug, from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return request(`/public/${slug}/slots?${params}`, { token: null });
}

export function bookSlot(slug, body) {
  return request(`/public/${slug}/book`, {
    method: 'POST',
    body,
    token: null,
  });
}

export function joinWaitlist(slug, body) {
  return request(`/public/${slug}/waitlist`, {
    method: 'POST',
    body,
    token: null,
  });
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
    token: null,
  });
}

export function getMe() {
  return request('/me');
}

export function getWaitlist() {
  return request('/me/waitlist');
}

export function cancelWaitlistEntry(id) {
  return request(`/me/waitlist/${id}/cancel`, { method: 'PATCH' });
}

export function getBookingLink() {
  return request('/me/booking-link');
}
