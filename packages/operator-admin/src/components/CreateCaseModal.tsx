'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { api } from '../lib/api';

interface Props {
  conversationId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCaseModal({ conversationId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const operatorName =
    typeof window !== 'undefined' ? localStorage.getItem('operatorName') : '';

  const handleSubmit = async () => {
    if (!title.trim() || !summary.trim()) return;
    const res = await api(`/admin/conversations/${conversationId}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, created_by: operatorName }),
    });
    if (res.ok) {
      onCreated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">Создать кейс</h2>
        <input
          className="w-full border border-gray-300 rounded-md p-3 mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={4}
          placeholder="Краткое описание"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !summary.trim()}>
            Создать
          </Button>
        </div>
      </div>
    </div>
  );
}
