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

  useEffect(() => {
    const s = connectSSE();
    setStream(s);
    return () => {
      s.close();
    };
  }, []);

  useEffect(() => {
    const loadCats = async () => {
      const res = await api('/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    };
    loadCats();
  }, []);

  const handleChange = (f: Filters) => {
    setFilters((prev) => ({ ...prev, ...f }));
  };

  return (
    <AuthGuard>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Диалоги</h1>
        <div className="flex gap-2 mb-2">
          <button
            className={`px-3 py-1 border rounded ${
              !filters.categoryId || filters.categoryId === 'all'
                ? 'bg-gray-200'
                : ''
            }`}
            onClick={() => handleChange({ categoryId: 'all' })}
          >
            All
          </button>
          {categories.slice(0, 5).map((c) => (
            <button
              key={c.id}
              className={`px-3 py-1 border rounded ${
                filters.categoryId === c.id ? 'bg-gray-200' : ''
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

