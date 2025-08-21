'use client';

import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { Chat } from '../types/chat';
import { 
  Search, 
  Filter, 
  Pin, 
  Star, 
  X, 
  MessageCircle, 
  Bot, 
  User,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ChatListProps {
  onChatSelect: (chat: Chat) => void;
}

export function ChatList({ onChatSelect }: ChatListProps) {
  const { state, dispatch, filteredChats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const handleChatClick = (chat: Chat) => {
    onChatSelect(chat);
    dispatch({ type: 'MARK_CHAT_READ', payload: chat.id });
  };

  const toggleFilters = () => {
    dispatch({ type: 'TOGGLE_FILTERS' });
  };

  const getStatusColor = (status: Chat['status']) => {
    switch (status) {
      case 'new':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Chat['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSourceIcon = (source: Chat['source']) => {
    switch (source) {
      case 'telegram':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'website':
        return <User className="w-4 h-4 text-green-500" />;
      case 'p2p':
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'сейчас';
    if (minutes < 60) return `${minutes}м`;
    if (hours < 24) return `${hours}ч`;
    return `${days}д`;
  };

  const filteredBySearch = filteredChats.filter(chat =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.last_message.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.user.id.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Заголовок и поиск */}
      <div className="p-4 border-b border-border-light">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Чаты</h2>
          <button
            onClick={toggleFilters}
            className={`p-2 rounded-button transition-colors ${
              Object.keys(state.filters).length > 0
                ? 'bg-accent-blue text-white'
                : 'bg-white text-text-secondary hover:bg-gray-50'
            }`}
            aria-label="Фильтры"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Поиск по имени, ID или тексту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-border-light rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
          />
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {filteredBySearch.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-text-muted" />
            <p>Чаты не найдены</p>
          </div>
        ) : (
          filteredBySearch.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleChatClick(chat)}
              className={`p-4 border-b border-border-light cursor-pointer transition-all hover:bg-white ${
                state.currentChat?.id === chat.id ? 'bg-white shadow-card' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Аватар */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-accent-blue rounded-full flex items-center justify-center text-white font-medium">
                    {chat.user.avatar_url ? (
                      <img
                        src={chat.user.avatar_url}
                        alt={chat.user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      chat.user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  {/* Индикатор источника */}
                  <div className="absolute -bottom-1 -right-1">
                    {getSourceIcon(chat.source)}
                  </div>
                </div>

                {/* Основная информация */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-text-primary truncate">
                        {chat.user.name}
                      </span>
                      
                      {/* Приоритет */}
                      <div
                        className={`w-2 h-2 rounded-full ${getPriorityColor(chat.priority)}`}
                        title={`Приоритет: ${chat.priority}`}
                      />
                      
                      {/* VIP метка */}
                      {chat.user.is_vip && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          VIP
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {/* Время */}
                      <span className="text-xs text-text-muted">
                        {formatTime(chat.updated_at)}
                      </span>
                      
                      {/* Закрепление */}
                      {chat.is_pinned && (
                        <Pin className="w-4 h-4 text-accent-blue" />
                      )}
                      
                      {/* Важность */}
                      {chat.is_important && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  {/* Статус и метки */}
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(chat.status)}`}>
                      {chat.status === 'new' && 'Новый'}
                      {chat.status === 'in_progress' && 'В работе'}
                      {chat.status === 'closed' && 'Закрыт'}
                    </span>
                    
                    {chat.assigned_operator && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Назначен
                      </span>
                    )}
                  </div>

                  {/* Последнее сообщение */}
                  <div className="flex items-center space-x-2">
                    {chat.last_message.author === 'bot' ? (
                      <Bot className="w-4 h-4 text-blue-500" />
                    ) : (
                      <User className="w-4 h-4 text-green-500" />
                    )}
                    
                    <p className="text-sm text-text-secondary truncate flex-1">
                      {chat.last_message.text}
                    </p>
                  </div>

                  {/* Вложения */}
                  {chat.has_attachments && (
                    <div className="mt-2 flex items-center text-xs text-text-muted">
                      <span>📎 Вложения</span>
                    </div>
                  )}
                </div>

                {/* Счетчик непрочитанных */}
                {chat.unread_count > 0 && (
                  <div className="flex-shrink-0">
                    <div className="bg-accent-blue text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
                      {chat.unread_count > 99 ? '99+' : chat.unread_count}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Счетчик чатов */}
      <div className="p-3 border-t border-border-light bg-white text-sm text-text-secondary">
        Всего: {filteredBySearch.length} чатов
      </div>
    </div>
  );
}
