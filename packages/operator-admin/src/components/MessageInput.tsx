'use client';

import { useState, useRef } from 'react';
import { Button } from '@shadcn/ui/button';
import { Input } from '@shadcn/ui/input';
import { api } from '../lib/api';
import SavedRepliesDrawer from './SavedRepliesDrawer';

interface MessageInputProps {
  conversationId: string;
  assigneeName?: string | null;
}

export default function MessageInput({
  conversationId,
  assigneeName,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const operatorName =
    typeof window !== 'undefined' ? localStorage.getItem('operatorName') : null;

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    if (!operatorName || assigneeName !== operatorName) {
      setToast('Диалог не закреплён за вами');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    setSending(true);
    try {
      const res = await api(`/admin/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author_name: operatorName }),
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const message = data?.data || data;
      window.dispatchEvent(new CustomEvent('op_reply', { detail: message }));
      setText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;
    setSending(true);
    try {
      if (!operatorName || assigneeName !== operatorName) {
        setToast('Диалог не закреплён за вами');
        setTimeout(() => setToast(''), 2000);
        return;
      }
      const form = new FormData();
      form.append('file', file);
      const res = await api(
        `/admin/conversations/${conversationId}/attachments?author_name=${encodeURIComponent(
          operatorName
        )}`,
        {
          method: 'POST',
          body: form,
        }
      );
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const message = data?.data || data;
      window.dispatchEvent(new CustomEvent('op_reply', { detail: message }));
      setToast('Отправлено');
      setTimeout(() => setToast(''), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex space-x-2 items-center">
      <SavedRepliesDrawer onInsert={(t) => setText((prev) => prev + t)} />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending}>
        📎
      </Button>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Введите сообщение"
        className="flex-1"
      />
      <Button onClick={handleSend} disabled={sending}>
        Отправить
      </Button>
      {toast && <span className="text-sm text-green-600">{toast}</span>}
    </div>
  );
}
