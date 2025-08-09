'use client';

export function api(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? '';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    ...init.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(`${base}${path}`, {
    ...init,
    headers,
  });
}
