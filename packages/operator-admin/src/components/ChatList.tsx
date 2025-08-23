import React, { useState } from 'react';
import { Chat, FilterOptions } from '../types';
import { ChevronDownIcon, MapPinIcon, StarIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: number | null;
  onSelectChat: (chat: Chat) => void;
  onTakeChat: (chatId: number) => void;
  filters: FilterOptions;
  onUpdateFilters: (filters: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  onTakeChat,
  filters,
  onUpdateFilters,
  onResetFilters,
  loading,
  hasMore,
  onLoadMore
}: ChatListProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'telegram': return '📱';
      case 'website': return '🌐';
      case 'p2p': return '💱';
      default: return '📝';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}м`;
    if (hours < 24) return `${hours}ч`;
    return `${days}д`;
  };

  const filteredChats = chats.filter(chat => {
    if (filters.status && filters.status.length > 0 && !filters.status.includes(chat.status)) return false;
    if (filters.source && filters.source.length > 0 && !filters.source.includes(chat.source)) return false;
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(chat.priority)) return false;
    if (filters.has_attachments && chat.last_message.attachments?.length === 0) return false;
    return true;
  });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Заголовок с фильтрами */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Чаты</h2>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Открыть/закрыть фильтры"
          >
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Фильтры */}
        {filtersOpen && (
          <div className="absolute top-16 left-4 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 fade-in">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => {
                    const value = (e.target as any).value;
                    onUpdateFilters({ status: value ? [value] : [] });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Фильтр по статусу"
                >
                  <option value="">Все статусы</option>
                  <option value="waiting">В ожидании</option>
                  <option value="in_progress">В работе</option>
                  <option value="closed">Закрыт</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Источник</label>
                <select
                  value={filters.source || ''}
                  onChange={(e) => {
                    const value = (e.target as any).value;
                    onUpdateFilters({ source: value ? [value] : [] });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Фильтр по источнику"
                >
                  <option value="">Все источники</option>
                  <option value="telegram">Telegram</option>
                  <option value="website">Сайт</option>
                  <option value="p2p">P2P</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => {
                    const value = (e.target as any).value;
                    onUpdateFilters({ priority: value ? [value] : [] });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Фильтр по приоритету"
                >
                  <option value="">Все приоритеты</option>
                  <option value="urgent">Срочно</option>
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_attachments"
                  checked={filters.has_attachments || false}
                  onChange={(e) => onUpdateFilters({ has_attachments: (e.target as any).checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="has_attachments" className="text-sm text-gray-700">
                  С вложениями
                </label>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={onResetFilters}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Сбросить
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Загрузка чатов...</div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Чаты не найдены</div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedChatId === chat.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Аватар */}
                <div className="flex-shrink-0">
                  {chat.user.avatar_url ? (
                    <img
                      src={chat.user.avatar_url}
                      alt={chat.user.first_name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {chat.user.first_name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Информация о чате */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 truncate">
                        {chat.user.first_name} {chat.user.last_name}
                      </span>
                      {chat.user.is_verified && (
                        <span className="text-blue-600 text-xs">✓</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {chat.is_pinned && (
                        <MapPinIcon className="w-4 h-4 text-yellow-500" />
                      )}
                      {chat.is_important && (
                        <StarIcon className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Последнее сообщение */}
                  <p className="text-sm text-gray-600 truncate mb-2">
                    {chat.last_message.text}
                  </p>

                  {/* Метаданные */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(chat.status)}>
                        {chat.status === 'waiting' ? 'Ожидает' : 
                         chat.status === 'in_progress' ? 'В работе' : 'Закрыт'}
                      </span>
                      <span className={getPriorityColor(chat.priority)}>
                        {chat.priority === 'urgent' ? 'Срочно' :
                         chat.priority === 'high' ? 'Высокий' :
                         chat.priority === 'medium' ? 'Средний' : 'Низкий'}
                      </span>
                      <span>{getSourceIcon(chat.source)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {chat.unread_count > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          {chat.unread_count}
                        </span>
                      )}
                      <span>{formatTime(chat.last_message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопка принятия чата */}
              {chat.status === 'waiting' && (
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTakeChat(chat.id);
                    }}
                    className="w-full px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Принять чат
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Кнопка "Загрузить еще" */}
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Загрузка...' : 'Загрузить еще'}
            </button>
          </div>
        )}
        
        {/* Индикатор загрузки */}
        {loading && chats.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Загрузка чатов...</p>
          </div>
        )}
        
        {/* Сообщение об отсутствии чатов */}
        {!loading && chats.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>Чаты не найдены</p>
            <p className="text-sm">Попробуйте изменить фильтры</p>
          </div>
        )}
      </div>
    </div>
  );
}
