'use client';

import { notify, playBeep, requestPermission } from './notifications';

export function connectSSE() {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? '';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (typeof window !== 'undefined' && localStorage.getItem('desktopNotify') === '1') {
    requestPermission();
  }
  const url = token
    ? `${base}/admin/stream?token=${encodeURIComponent(token)}`
    : `${base}/admin/stream`;
  const es = new EventSource(url);

  es.addEventListener('user_msg', (e) => {
    try {
      if (typeof window === 'undefined') return;
      const data = JSON.parse((e as MessageEvent).data);
      if (localStorage.getItem('soundOn') === '1') {
        playBeep();
      }
      if (localStorage.getItem('desktopNotify') === '1') {
        notify('Новое сообщение', data.content || '');
      }
    } catch (err) {
      console.error(err);
    }
  });

  es.addEventListener('assigned', (e) => {
    try {
      if (typeof window === 'undefined') return;
      const data = JSON.parse((e as MessageEvent).data);
      if (localStorage.getItem('notifyAssigned') === '1') {
        notify('Чат назначен вам', data.conversation_id ? `Чат ${data.conversation_id}` : '');
      }
    } catch (err) {
      console.error(err);
    }
  });

  return es;
}
