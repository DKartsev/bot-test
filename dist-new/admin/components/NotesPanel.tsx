'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
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
    <div className="flex flex-col h-full border rounded-lg p-4 bg-white shadow">
      <h3 className="font-semibold mb-3 text-gray-800">Заметки оператора</h3>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {notes.map((n) => (
          <div key={n.id} className="relative p-3 border rounded-md bg-gray-50">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition-colors"
              onClick={() => handleDelete(n.id)}
              aria-label="Удалить"
            >
              <Trash2 size={16} />
            </button>
            <div className="text-xs text-gray-500 mb-2 pr-6">
              {n.author_name} — {new Date(n.created_at).toLocaleString()}
            </div>
            <div className="whitespace-pre-wrap text-sm text-gray-800 pr-6">{n.content}</div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            Заметок пока нет
          </div>
        )}
      </div>
      <div>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
          placeholder="Добавить заметку..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!content.trim()} className="w-full">
          Сохранить
        </Button>
      </div>
    </div>
  );
}
