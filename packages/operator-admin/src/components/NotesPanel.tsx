'use client';

import { useEffect, useState } from 'react';
import { Button } from '@shadcn/ui/button';
import { Trash2 } from 'lucide-react';
import { api } from '../lib/api';

interface Note {
  id: string;
  conversation_id: string;
  message_id?: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export default function NotesPanel({ conversationId }: { conversationId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const operatorName = typeof window !== 'undefined' ? localStorage.getItem('operatorName') : null;

  const loadNotes = async () => {
    const res = await api(`/admin/conversations/${conversationId}/notes`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes || []);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSave = async () => {
    if (!operatorName || !content.trim()) return;
    const res = await api(`/admin/conversations/${conversationId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, author_name: operatorName })
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [...prev, note]);
      setContent('');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api(`/admin/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  if (!operatorName) {
    return (
      <div className="p-2 text-sm text-gray-600">
        Укажите имя оператора в{' '}
        <a href="/settings" className="underline text-blue-600">
          настройках
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border rounded p-2">
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {notes.map((n) => (
          <div key={n.id} className="relative p-2 border rounded">
            <button
              className="absolute top-1 right-1 text-gray-500 hover:text-red-600"
              onClick={() => handleDelete(n.id)}
              aria-label="Удалить"
            >
              <Trash2 size={16} />
            </button>
            <div className="text-xs text-gray-600 mb-1">
              {n.author_name} — {new Date(n.created_at).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap text-sm">{n.content}</div>
          </div>
        ))}
      </div>
      <div>
        <textarea
          className="w-full border rounded p-2 mb-2"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!content.trim()}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}
