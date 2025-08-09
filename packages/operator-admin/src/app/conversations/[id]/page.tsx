'use client';

import { useEffect, useState } from 'react';
import { Button } from '@shadcn/ui/button';
import AuthGuard from '../../../components/AuthGuard';
import ChatView from '../../../components/ChatView';
import MessageInput from '../../../components/MessageInput';
import NotesPanel from '../../../components/NotesPanel';
import { api } from '../../../lib/api';
import CategoryBadge from '../../../components/CategoryBadge';
import CreateCaseModal from '../../../components/CreateCaseModal';

interface Conversation {
  id: string;
  status: string;
  handoff: 'human' | 'bot';
  category?: { id: string; name: string; color?: string } | null;
}

export default function ConversationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [toast, setToast] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [editingCategory, setEditingCategory] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await api(`/admin/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data);
      }
    };
    load();
  }, [id]);

  const handleReturn = async () => {
    const res = await api(`/admin/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handoff: 'bot' }),
    });
    if (res.ok) {
      const data = await res.json();
      setConversation(data);
      setToast('Теперь беседа снова обрабатывается ботом');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleEditCategory = async () => {
    if (categories.length === 0) {
      const res = await api('/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    }
    setEditingCategory(true);
  };

  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category_id = e.target.value === 'none' ? null : e.target.value;
    const res = await api(`/admin/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id }),
    });
    if (res.ok) {
      const selected = categories.find((c) => c.id === category_id);
      setConversation((prev) =>
        prev ? { ...prev, category: selected || null } : prev
      );
    }
    setEditingCategory(false);
  };

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen p-4">
        {toast && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded">
            {toast}
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Диалог {id}</h1>
            {conversation && (
              <div className="text-sm text-gray-600">
                status: {conversation.status}, handoff: {conversation.handoff}
                {conversation.category && (
                  <span className="ml-2">
                    <CategoryBadge
                      name={conversation.category.name}
                      color={conversation.category.color}
                    />
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {conversation?.handoff === 'human' && (
              <Button onClick={handleReturn}>Вернуть боту</Button>
            )}
            <Button variant="secondary" onClick={handleEditCategory}>
              Изменить категорию
            </Button>
            <Button variant="secondary" onClick={() => setShowCaseModal(true)}>
              Создать кейс
            </Button>
            {editingCategory && (
              <select
                className="border p-1 rounded"
                onChange={handleCategoryChange}
                defaultValue={conversation?.category?.id ?? 'none'}
              >
                <option value="none">Без категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-4 mb-4 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4">
              <ChatView conversationId={id} initialHandoff={conversation?.handoff === 'human'} />
            </div>
            <MessageInput conversationId={id} />
          </div>
          <div className="md:w-80 w-full flex-shrink-0 overflow-y-auto">
            <NotesPanel conversationId={id} />
          </div>
        </div>
      </div>
      {showCaseModal && (
        <CreateCaseModal
          conversationId={id}
          onClose={() => setShowCaseModal(false)}
          onCreated={() => {
            setToast('Кейс создан и отправлен в TG');
            setTimeout(() => setToast(''), 3000);
          }}
        />
      )}
    </AuthGuard>
  );
}
