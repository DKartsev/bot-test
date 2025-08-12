'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { api } from '../lib/api';
import { connectSSE } from '../lib/stream';

interface Message {
  id: string;
  role: 'user' | 'bot' | 'operator';
  content: string;
  created_at: string;
  media_urls?: string[];
  transcript?: string;
  vision_summary?: string;
  conversation_id?: string;
}

interface ChatViewProps {
  conversationId: string;
  initialHandoff?: boolean;
}

export default function ChatView({ conversationId, initialHandoff = false }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [handoff, setHandoff] = useState(initialHandoff);
  const messagesRef = useRef<Message[]>([]);

  messagesRef.current = messages;

  const loadMessages = async (initial = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (!initial && cursor) params.append('cursor', cursor);
      const res = await api(`/admin/conversations/${conversationId}/messages?${params.toString()}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const list: Message[] = Array.isArray(data) ? data : data.data || [];
      const sorted = list.reverse();
      setMessages((prev) => (initial ? sorted : [...sorted, ...prev]));
      if (list.length < 50) setHasMore(false);
      if (list.length > 0) {
        const oldest = list[list.length - 1];
        setCursor(oldest.created_at);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMessages([]);
    setCursor(null);
    setHasMore(true);
    setHandoff(initialHandoff);
    loadMessages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    setHandoff(initialHandoff);
  }, [initialHandoff]);

  useEffect(() => {
    const handleLocal = (e: Event) => {
      const detail = (e as CustomEvent<Message>).detail;
      if (detail && detail.conversation_id === conversationId) {
        setMessages((prev) => [...prev, detail]);
      }
    };
    window.addEventListener('op_reply', handleLocal as EventListener);
    return () => {
      window.removeEventListener('op_reply', handleLocal as EventListener);
    };
  }, [conversationId]);

  useEffect(() => {
    const es = connectSSE();
    es.addEventListener('user_msg', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.conversation_id === conversationId) {
        loadMessages(true);
      }
    });
    es.addEventListener('media_upd', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (messagesRef.current.some((m) => m.id === data.message_id)) {
        loadMessages(true);
      }
    });
    es.addEventListener('handoff', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.conversation_id === conversationId) {
        setHandoff(data.handoff === 'human');
      }
    });
    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleLoadMore = () => {
    if (!loading) {
      loadMessages();
    }
  };

  const roleBg = (role: Message['role']) => {
    if (role === 'operator') return 'bg-blue-100';
    if (role === 'bot') return 'bg-green-100';
    return 'bg-gray-100';
  };

  return (
    <div>
      {handoff && (
        <div className="p-3 bg-yellow-100 border border-yellow-200 text-yellow-800 text-center mb-4 rounded-md">
          🤝 Разговор передан оператору
        </div>
      )}
      {hasMore && (
        <div className="text-center my-4">
          <Button onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Загрузка...' : 'Загрузить ранние сообщения'}
          </Button>
        </div>
      )}
      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`p-3 rounded-lg ${roleBg(m.role)} border`}>
            <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
              <span>{new Date(m.created_at).toLocaleString()}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                m.role === 'operator' ? 'bg-blue-600 text-white' :
                m.role === 'bot' ? 'bg-green-600 text-white' :
                'bg-gray-600 text-white'
              }`}>
                {m.role === 'operator' ? 'Оператор' : m.role === 'bot' ? 'Бот' : 'Пользователь'}
              </span>
            </div>
            <div className="text-sm leading-relaxed">{m.content}</div>
            {m.media_urls && m.media_urls.length > 0 && (
              <div className="mt-2 space-y-2">
                {m.media_urls.map((url) => (
                  <div key={url} className="border rounded p-2 bg-white">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Открыть медиафайл
                    </a>
                    <img src={url} alt="media" className="mt-2 max-w-xs rounded" />
                  </div>
                ))}
              </div>
            )}
            {(m.transcript || m.vision_summary) && (
              <div className="mt-3 p-2 bg-white rounded border text-sm text-gray-600">
                {m.transcript && <div className="mb-1"><strong>📜 Транскрипт:</strong> {m.transcript}</div>}
                {m.vision_summary && <div><strong>👁️ Описание:</strong> {m.vision_summary}</div>}
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Сообщений пока нет
          </div>
        )}
      </div>
    </div>
  );
}
