'use client';

import { useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import ConversationFilters from '../../components/ConversationFilters';
import ConversationList from '../../components/ConversationList';

interface Filters {
  status?: string;
  handoff?: string;
  search?: string;
}

export default function ConversationsPage() {
  const [filters, setFilters] = useState<Filters>({
    status: 'open',
    handoff: 'human',
    search: '',
  });

  const handleChange = (f: Filters) => {
    setFilters((prev) => ({ ...prev, ...f }));
  };

  return (
    <AuthGuard>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Диалоги</h1>
        <ConversationFilters
          status={filters.status}
          handoff={filters.handoff}
          search={filters.search}
          onChange={handleChange}
        />
        <ConversationList
          status={filters.status}
          handoff={filters.handoff}
          search={filters.search}
        />
      </div>
    </AuthGuard>
  );
}

