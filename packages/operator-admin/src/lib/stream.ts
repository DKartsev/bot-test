'use client';

export function connectSSE() {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? '';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const url = token
    ? `${base}/admin/stream?token=${encodeURIComponent(token)}`
    : `${base}/admin/stream`;
  return new EventSource(url);
}
