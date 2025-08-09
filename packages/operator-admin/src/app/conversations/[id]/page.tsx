'use client';

import { useEffect, useState } from 'react';
import { Button } from '@shadcn/ui/button';
import AuthGuard from '../../../components/AuthGuard';
import ChatView from '../../../components/ChatView';
import MessageInput from '../../../components/MessageInput';
import NotesPanel from '../../../components/NotesPanel';
import { api } from '../../../lib/api';

interface Conversation {
  id: string;
  status: string;
  handoff: 'human' | 'bot';
}

export default function ConversationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [toast, setToast] = useState('');

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
              </div>
            )}
          </div>
          {conversation?.handoff === 'human' && (
            <Button onClick={handleReturn}>Вернуть боту</Button>
          )}
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
    </AuthGuard>
  );
}
