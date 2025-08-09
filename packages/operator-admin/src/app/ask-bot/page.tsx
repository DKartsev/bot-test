'use client';

import { useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { api } from '../../lib/api';
import { Button } from '@shadcn/ui/button';
import { Input } from '@shadcn/ui/input';

interface ChatMessage {
  role: 'operator' | 'bot';
  content: string;
  created_at: string;
}

export default function AskBotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const roleBg = (role: ChatMessage['role']) =>
    role === 'operator' ? 'bg-blue-100' : 'bg-green-100';

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const question = text;
    setMessages((prev) => [
      ...prev,
      { role: 'operator', content: question, created_at: new Date().toISOString() },
    ]);
    setText('');
    setSending(true);
    try {
      const res = await api('/admin/ask-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: data.answer, created_at: new Date().toISOString() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: 'Ошибка сервера', created_at: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Сеть недоступна', created_at: new Date().toISOString() },
      ]);
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

  return (
    <AuthGuard>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Спросить у бота</h1>
        <div className="space-y-2 mb-4">
          {messages.map((m, i) => (
            <div key={i} className={`p-2 rounded ${roleBg(m.role)}`}>
              <div className="text-xs text-gray-600 mb-1">
                {new Date(m.created_at).toLocaleString()} — {m.role}
              </div>
              <div>{m.content}</div>
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Введите вопрос"
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={sending}>
            Отправить
          </Button>
        </div>
      </div>
    </AuthGuard>
  );
}
