'use client';

import { useEffect, useState } from 'react';
import { Button } from '@shadcn/ui/button';
import { Input } from '@shadcn/ui/input';
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
      <Button onClick={() => setOpen(true)} variant="secondary">
        Сохранённые
      </Button>
      {open && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setOpen(false)}
          ></div>
          <div className="relative w-80 h-full bg-white shadow-xl p-4 overflow-y-auto">
            <div className="mb-2 flex items-center space-x-2">
              <Input
                placeholder="Поиск"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="border rounded p-1"
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
              <Button onClick={openNew}>Добавить</Button>
            </div>
            <div className="space-y-2">
              {replies.map((r) => (
                <div key={r.id} className="border p-2 rounded">
                  <div className="font-medium">{r.title}</div>
                  {r.tags.length > 0 && (
                    <div className="text-xs text-gray-500">{r.tags.join(', ')}</div>
                  )}
                  <div className="mt-1 text-sm whitespace-pre-wrap break-words">
                    {r.content}
                  </div>
                  <div className="mt-2 flex space-x-2">
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
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setEditing(null)}
          ></div>
          <div className="relative bg-white p-4 w-96 space-y-2 rounded shadow">
            <Input
              placeholder="Заголовок"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="w-full border rounded p-2 h-40"
              placeholder="Контент"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <Input
              placeholder="Теги через запятую"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Отмена
              </Button>
              <Button onClick={save}>Сохранить</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
