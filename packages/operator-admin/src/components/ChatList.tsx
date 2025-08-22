'use client';

import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { TelegramChat } from '../lib/telegram-api';

export function ChatList() {
  const { chats, selectChat, selectedChat, loading, error } = useChat();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredChats = chats.filter(chat => {
    // Фильтр по статусу
    if (filter === 'active' && chat.status !== 'active') return false;
    if (filter === 'inactive' && chat.status !== 'inactive') return false;
    
    // Поиск по названию или имени пользователя
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        chat.title.toLowerCase().includes(searchLower) ||
        chat.first_name?.toLowerCase().includes(searchLower) ||
        chat.last_name?.toLowerCase().includes(searchLower) ||
        chat.username?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const getChatDisplayName = (chat: TelegramChat) => {
    if (chat.type === 'private') {
      if (chat.first_name && chat.last_name) {
        return `${chat.first_name} ${chat.last_name}`;
      }
      if (chat.first_name) {
        return chat.first_name;
      }
      if (chat.username) {
        return `@${chat.username}`;
      }
      return chat.title;
    }
    return chat.title;
  };

  const getChatAvatar = (chat: TelegramChat) => {
    if (chat.type === 'private') {
      return chat.first_name?.charAt(0).toUpperCase() || 'U';
    }
    return chat.title.charAt(0).toUpperCase();
  };

  const getChatStatusColor = (chat: TelegramChat) => {
    switch (chat.status) {
      case 'active':
        return 'bg-green-100 text-green-600';
      case 'inactive':
        return 'bg-gray-100 text-gray-600';
      case 'blocked':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  if (loading) {
    return (
      <div className='w-80 bg-white border-r border-gray-200 flex flex-col'>
        <div className='p-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Чаты</h2>
          <div className='animate-pulse'>
            <div className='h-10 bg-gray-200 rounded mb-4'></div>
            <div className='space-y-3'>
              {[1, 2, 3].map(i => (
                <div key={i} className='h-20 bg-gray-200 rounded'></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='w-80 bg-white border-r border-gray-200 flex flex-col'>
        <div className='p-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>Чаты</h2>
          <div className='p-4 text-center text-red-600'>
            <p>Ошибка загрузки чатов:</p>
            <p className='text-sm mt-1'>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-80 bg-white border-r border-gray-200 flex flex-col'>
      {/* Заголовок */}
      <div className='p-4 border-b border-gray-200'>
        <div className='flex items-center justify-between mb-4'>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className='text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none'
          >
            <option value='all'>Все чаты</option>
            <option value='active'>Активные</option>
            <option value='inactive'>Неактивные</option>
          </select>
          
          <div className='flex items-center space-x-2'>
            <button className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200'>
              <svg className='w-4 h-4 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
            </button>
            <button className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200'>
              <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a2 2 0 00-2.828-2.828z' />
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6.172 15.172a4 4 0 015.656 0M9 12h6m-6-4h4' />
              </svg>
            </button>
            <button className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200'>
              <svg className='w-4 h-4 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </button>
          </div>
        </div>
        
        <input
          type='text'
          placeholder='Поиск чатов...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />
      </div>

      {/* Список чатов */}
      <div className='flex-1 overflow-y-auto'>
        {filteredChats.length === 0 ? (
          <div className='p-4 text-center text-gray-500'>
            {search ? 'Чаты не найдены' : 'Нет активных чатов'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className='flex items-start space-x-3'>
                {/* Аватар */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getChatStatusColor(chat)}`}>
                  <span className='font-semibold text-sm'>
                    {getChatAvatar(chat)}
                  </span>
                </div>
                
                {/* Информация о чате */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between mb-1'>
                    <h3 className='text-sm font-medium text-gray-900 truncate'>
                      {getChatDisplayName(chat)}
                    </h3>
                    <span className='text-xs text-gray-500'>
                      {chat.last_message_date ? 
                        new Date(chat.last_message_date).toLocaleTimeString('ru-RU', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''
                      }
                    </span>
                  </div>
                  
                  <p className='text-sm text-gray-600 truncate mb-2'>
                    {chat.last_message || 'Нет сообщений'}
                  </p>
                  
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500'>
                      {chat.type === 'private' ? 'Личный чат' : 'Группа'}
                    </span>
                    
                    <div className='flex items-center space-x-2'>
                      {chat.unread_count && chat.unread_count > 0 && (
                        <span className='w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center'>
                          {chat.unread_count}
                        </span>
                      )}
                      
                      <span className={`px-2 py-1 text-xs rounded-full ${getChatStatusColor(chat)}`}>
                        {chat.status === 'active' ? 'Активен' : 
                         chat.status === 'inactive' ? 'Неактивен' : 'Заблокирован'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
