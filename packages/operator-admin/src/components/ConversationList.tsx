'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import CategoryBadge from './CategoryBadge';
import { api } from '../lib/api';

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
      const res = await api(
        `/admin/conversations?${buildQuery(initial ? undefined : cursor || undefined)}`
      );
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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telegram ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Режим</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Оператор</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Обновлено</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Последнее сообщение</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((conv) => (
            <tr
              key={conv.id}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => router.push(`/conversations/${conv.id}`)}
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{conv.user_telegram_id}</td>
              <td className="px-4 py-3 text-sm">
                {conv.category ? (
                  <CategoryBadge
                    name={conv.category.name}
                    color={conv.category.color}
                  />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  conv.status === 'open' ? 'bg-green-100 text-green-800' :
                  conv.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {conv.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  conv.handoff === 'human' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {conv.handoff === 'human' ? 'Оператор' : 'Бот'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">{conv.assignee_name || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{new Date(conv.updated_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                {conv.last_message_preview || '—'}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="px-4 py-3 bg-gray-50 border-t">
          <Button onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Загрузка...' : 'Загрузить ещё'}
          </Button>
        </div>
      )}
      {items.length === 0 && !loading && (
        <div className="px-4 py-8 text-center text-gray-500">
          Диалоги не найдены
        </div>
      )}
    </div>
  );
}

