'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@shadcn/ui/button';
import CategoryBadge from './CategoryBadge';

interface Conversation {
  id: string;
  user_telegram_id: string;
  status: string;
  handoff: string;
  updated_at: string;
  last_message_preview?: string;
  category?: { name: string; color?: string } | null;
  assignee_name?: string | null;
}

interface ConversationListProps {
  status?: string;
  handoff?: string;
  search?: string;
  categoryId?: string;
  onLoadMore?: () => void;
  stream?: EventSource | null;
  mine?: boolean;
}

export default function ConversationList({
  status,
  handoff,
  search,
  categoryId,
  onLoadMore,
  stream,
  mine,
}: ConversationListProps) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const buildQuery = (cur?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (handoff && handoff !== 'all') params.append('handoff', handoff);
    if (search) params.append('search', search);
    if (categoryId && categoryId !== 'all')
      params.append('category_id', categoryId);
    if (mine) {
      const name =
        typeof window !== 'undefined' ? localStorage.getItem('operatorName') : null;
      if (name) params.append('assignee_name', name);
    }
    params.append('limit', '20');
    if (cur) params.append('cursor', cur);
    return params.toString();
  };

  const load = async (initial = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/admin/conversations?${buildQuery(initial ? undefined : cursor || undefined)}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const list: Conversation[] = Array.isArray(data)
        ? data
        : data.conversations || data.data || [];
      setItems((prev) => (initial ? list : [...prev, ...list]));
      if (list.length < 20) setHasMore(false);
      if (list.length > 0) {
        setCursor(list[list.length - 1].updated_at);
      }
      if (onLoadMore && !initial) onLoadMore();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, handoff, search, categoryId, mine]);

  const handleLoadMore = () => {
    if (!loading) {
      load();
    }
  };

  useEffect(() => {
    if (!stream) return;
    const refresh = () => load(true);
    let poller: ReturnType<typeof setInterval> | null = null;
    const onError = () => {
      if (stream.readyState === EventSource.CLOSED && !poller) {
        poller = setInterval(() => load(true), 60000);
      }
    };
    const stopPoll = () => {
      if (poller) {
        clearInterval(poller);
        poller = null;
      }
    };

    stream.addEventListener('user_msg', refresh);
    stream.addEventListener('handoff', refresh);
    stream.addEventListener('op_reply', refresh);
    stream.addEventListener('assigned', refresh);
    stream.addEventListener('open', stopPoll);
    stream.addEventListener('error', onError);

    return () => {
      stream.removeEventListener('user_msg', refresh);
      stream.removeEventListener('handoff', refresh);
      stream.removeEventListener('op_reply', refresh);
      stream.removeEventListener('assigned', refresh);
      stream.removeEventListener('open', stopPoll);
      stream.removeEventListener('error', onError);
      stopPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, status, handoff, search, categoryId, mine]);

  return (
    <div>
      <table className="min-w-full text-left border">
        <thead>
          <tr>
            <th className="p-2 border-b">Telegram ID</th>
            <th className="p-2 border-b">Категория</th>
            <th className="p-2 border-b">Статус</th>
            <th className="p-2 border-b">Handoff</th>
            <th className="p-2 border-b">Оператор</th>
            <th className="p-2 border-b">Обновлено</th>
            <th className="p-2 border-b">Последнее сообщение</th>
          </tr>
        </thead>
        <tbody>
          {items.map((conv) => (
            <tr
              key={conv.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => router.push(`/conversations/${conv.id}`)}
            >
              <td className="p-2 border-b">{conv.user_telegram_id}</td>
              <td className="p-2 border-b">
                {conv.category ? (
                  <CategoryBadge
                    name={conv.category.name}
                    color={conv.category.color}
                  />
                ) : null}
              </td>
              <td className="p-2 border-b">{conv.status}</td>
              <td className="p-2 border-b">{conv.handoff}</td>
              <td className="p-2 border-b">{conv.assignee_name || ''}</td>
              <td className="p-2 border-b">{new Date(conv.updated_at).toLocaleString()}</td>
              <td className="p-2 border-b">{conv.last_message_preview}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="mt-4">
          <Button onClick={handleLoadMore} disabled={loading}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

