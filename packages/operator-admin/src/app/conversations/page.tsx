'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import ConversationFilters from '../../components/ConversationFilters';
import ConversationList from '../../components/ConversationList';
import { connectSSE } from '../../lib/stream';
import { api } from '../../lib/api';

interface Filters {
  status?: string;
  handoff?: string;
  search?: string;
  categoryId?: string;
  mine?: boolean;
}

export default function ConversationsPage() {
  const [filters, setFilters] = useState<Filters>({
    status: 'open',
    handoff: 'human',
    search: '',
    categoryId: 'all',
    mine: false,
  });
  const [stream, setStream] = useState<EventSource | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = connectSSE();
    setStream(s);
    return () => {
      s.close();
    };
  }, []);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const res = await api('/admin/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data || []);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCats();
  }, []);

  const handleChange = (f: Filters) => {
    setFilters((prev) => ({ ...prev, ...f }));
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-4">
          <div>Загрузка...</div>
        </div>
      </AuthGuard>
    );
  }
  return (
    <AuthGuard>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Диалоги</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-3 py-1 border rounded ${
              !filters.categoryId || filters.categoryId === 'all'
                ? 'bg-blue-500 text-white'
                : ''
            }`}
            onClick={() => handleChange({ categoryId: 'all' })}
          >
            Все категории
          </button>
          {categories.slice(0, 5).map((c) => (
            <button
              key={c.id}
              className={`px-3 py-1 border rounded ${
                filters.categoryId === c.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
              }`}
              onClick={() => handleChange({ categoryId: c.id })}
            >
              {c.name}
            </button>
          ))}
        </div>
        <ConversationFilters
          status={filters.status}
          handoff={filters.handoff}
          search={filters.search}
          categoryId={filters.categoryId}
          categories={categories}
          mine={filters.mine}
          onChange={handleChange}
        />
        <ConversationList
          status={filters.status}
          handoff={filters.handoff}
          search={filters.search}
          categoryId={filters.categoryId}
          mine={filters.mine}
          stream={stream}
        />
      </div>
    </AuthGuard>
  );
}

