'use client';

import { Input } from './ui/input';

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
    mine?: boolean;
  }) => void;
  mine?: boolean;
}

export default function ConversationFilters({
  status = 'all',
  handoff = 'all',
  search = '',
  categoryId = 'all',
  categories = [],
  onChange,
  mine = false,
}: ConversationFiltersProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ status: e.target.value, handoff, search, categoryId, mine });
  };

  const handleHandoffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ status, handoff: e.target.value, search, categoryId, mine });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ status, handoff, search: e.target.value, categoryId, mine });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ status, handoff, search, categoryId: e.target.value, mine });
  };

  const handleMineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ status, handoff, search, categoryId, mine: e.target.checked });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <select
        className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={status}
        onChange={handleStatusChange}
      >
        <option value="all">Все</option>
        <option value="open">Открытые</option>
        <option value="closed">Закрытые</option>
      </select>
      <select
        className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        className="w-full"
      />
      <select
        className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <label className="flex items-center space-x-2">
        <input type="checkbox" checked={mine} onChange={handleMineChange} />
        <span className="text-sm">Только мои</span>
      </label>
    </div>
  );
}

