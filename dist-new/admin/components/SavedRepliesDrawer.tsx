'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../lib/api';

interface SavedReply {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updated_at: string;
}

interface SavedRepliesDrawerProps {
  onInsert: (text: string) => void;
}

export default function SavedRepliesDrawer({ onInsert }: SavedRepliesDrawerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [editing, setEditing] = useState<SavedReply | null>(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const load = async () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    const res = await api(`/admin/saved-replies?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setReplies(data.replies || data || []);
    }
  };

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, search, tag]);

  const allTags = Array.from(new Set(replies.flatMap((r) => r.tags)));

  const openNew = () => {
    setForm({ title: '', content: '', tags: '' });
    setEditing({ id: '', title: '', content: '', tags: [], updated_at: '' });
  };

  const openEdit = (r: SavedReply) => {
    setForm({ title: r.title, content: r.content, tags: r.tags.join(', ') });
    setEditing(r);
  };

  const save = async () => {
    const payload = {
      title: form.title,
      content: form.content,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    let res;
    if (editing && editing.id) {
      res = await api(`/admin/saved-replies/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await api('/admin/saved-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (res.ok) {
      setEditing(null);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return;
    const res = await api(`/admin/saved-replies/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        Сохранённые
      </Button>
      {open && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setOpen(false)}
          ></div>
          <div className="relative w-96 h-full bg-white shadow-xl p-6 overflow-y-auto">
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Сохранённые ответы</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <Input
                placeholder="Поиск"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="">Все теги</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button onClick={openNew} className="w-full">
                Добавить новый
              </Button>
            </div>
            <div className="space-y-3">
              {replies.map((r) => (
                <div key={r.id} className="border border-gray-200 p-3 rounded-md bg-gray-50">
                  <div className="font-medium text-gray-800 mb-1">{r.title}</div>
                  {r.tags.length > 0 && (
                    <div className="text-xs text-gray-500 mb-2">
                      {r.tags.map(tag => (
                        <span key={tag} className="inline-block bg-gray-200 px-2 py-1 rounded mr-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap break-words text-gray-700 mb-3">
                    {r.content}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onInsert(r.content);
                        setOpen(false);
                      }}
                    >
                      Вставить
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                      Редактировать
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
              {replies.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Сохранённых ответов пока нет
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setEditing(null)}
          ></div>
          <div className="relative bg-white p-6 w-full max-w-lg space-y-4 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold">
              {editing.id ? 'Редактировать ответ' : 'Новый ответ'}
            </h3>
            <Input
              placeholder="Заголовок"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Контент"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <Input
              placeholder="Теги через запятую"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Отмена
              </Button>
              <Button onClick={save} disabled={!form.title.trim() || !form.content.trim()}>
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
