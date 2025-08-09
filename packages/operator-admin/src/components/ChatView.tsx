'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@shadcn/ui/button';
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
        <div className="p-2 bg-yellow-100 text-center mb-2">Разговор передан оператору</div>
      )}
      {hasMore && (
        <div className="text-center my-2">
          <Button onClick={handleLoadMore} disabled={loading}>
            Загрузить ещё
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`p-2 rounded ${roleBg(m.role)}`}>
            <div className="text-xs text-gray-600 mb-1">
              {new Date(m.created_at).toLocaleString()} — {m.role}
            </div>
            <div>{m.content}</div>
            {m.media_urls && m.media_urls.length > 0 && (
              <div className="mt-2 space-y-2">
                {m.media_urls.map((url) => (
                  <div key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      {url}
                    </a>
                    <img src={url} alt="media" className="mt-1 max-w-xs" />
                  </div>
                ))}
              </div>
            )}
            {(m.transcript || m.vision_summary) && (
              <div className="mt-1 text-sm text-gray-600">
                {m.transcript && <div>📜 {m.transcript}</div>}
                {m.vision_summary && <div>👁️ {m.vision_summary}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
