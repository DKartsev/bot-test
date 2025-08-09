'use client';

import { Input } from '@shadcn/ui/input';

interface ConversationFiltersProps {
  status?: string;
  handoff?: string;
  search?: string;
  categoryId?: string;
  categories?: { id: string; name: string }[];
  onChange: (filters: {
    status?: string;
    handoff?: string;
    search?: string;
    categoryId?: string;
  }) => void;
}

export default function ConversationFilters({
  status = 'all',
  handoff = 'all',
  search = '',
  categoryId = 'all',
  categories = [],
  onChange,
}: ConversationFiltersProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ status: e.target.value, handoff, search });
  };

  const handleHandoffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ status, handoff: e.target.value, search });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ status, handoff, search: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ status, handoff, search, categoryId: e.target.value });
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select
        className="border p-2 rounded"
        value={status}
        onChange={handleStatusChange}
      >
        <option value="all">Все</option>
        <option value="open">Открытые</option>
        <option value="closed">Закрытые</option>
      </select>
      <select
        className="border p-2 rounded"
        value={handoff}
        onChange={handleHandoffChange}
      >
        <option value="all">Все</option>
        <option value="human">Оператор</option>
        <option value="bot">Бот</option>
      </select>
      <Input
        placeholder="Поиск по Telegram ID"
        value={search}
        onChange={handleSearchChange}
        className="max-w-xs"
      />
      <select
        className="border p-2 rounded"
        value={categoryId}
        onChange={handleCategoryChange}
      >
        <option value="all">Все категории</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

