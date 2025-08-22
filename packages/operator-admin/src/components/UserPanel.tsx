'use client';

import React from 'react';
import { useChat } from '../context/ChatContext';

export function UserPanel() {
  const { selectedChat } = useChat();

  if (!selectedChat) {
    return (
      <div className='w-80 bg-white border-l border-gray-200 p-4'>
        <div className='text-center text-gray-500 py-8'>
          <svg className='w-16 h-16 mx-auto mb-4 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
          </svg>
          <p className='text-lg font-medium'>Информация о чате</p>
          <p className='text-sm'>Выберите чат для просмотра деталей</p>
        </div>
      </div>
    );
  }

  const getChatDisplayName = () => {
    if (selectedChat.type === 'private') {
      if (selectedChat.first_name && selectedChat.last_name) {
        return `${selectedChat.first_name} ${selectedChat.last_name}`;
      }
      if (selectedChat.first_name) {
        return selectedChat.first_name;
      }
      if (selectedChat.username) {
        return `@${selectedChat.username}`;
      }
      return selectedChat.title;
    }
    return selectedChat.title;
  };

  const getChatAvatar = () => {
    if (selectedChat.type === 'private') {
      return selectedChat.first_name?.charAt(0).toUpperCase() || 'U';
    }
    return selectedChat.title.charAt(0).toUpperCase();
  };

  const getStatusColor = () => {
    switch (selectedChat.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeLabel = () => {
    switch (selectedChat.type) {
      case 'private':
        return 'Личный чат';
      case 'group':
        return 'Группа';
      case 'supergroup':
        return 'Супергруппа';
      case 'channel':
        return 'Канал';
      default:
        return 'Неизвестно';
    }
  };

  return (
    <div className='w-80 bg-white border-l border-gray-200 p-4'>
      {/* Заголовок */}
      <div className='mb-6'>
        <div className='flex items-center space-x-3 mb-3'>
          <div className='w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl'>
            {getChatAvatar()}
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>
              {getChatDisplayName()}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor()}`}>
              {selectedChat.status === 'active' ? 'Активен' : 
               selectedChat.status === 'inactive' ? 'Неактивен' : 'Заблокирован'}
            </span>
          </div>
        </div>
        
        <p className='text-sm text-gray-600'>
          {getTypeLabel()} • ID: {selectedChat.id}
        </p>
      </div>

      {/* Основная информация */}
      <div className='space-y-6'>
        {/* Свойства пользователя */}
        {selectedChat.type === 'private' && (
          <div>
            <h4 className='text-sm font-medium text-gray-900 mb-3'>Информация о пользователе</h4>
            <div className='space-y-3'>
              {selectedChat.first_name && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Имя</label>
                  <input 
                    type='text' 
                    value={selectedChat.first_name}
                    readOnly
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50' 
                  />
                </div>
              )}
              
              {selectedChat.last_name && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Фамилия</label>
                  <input 
                    type='text' 
                    value={selectedChat.last_name}
                    readOnly
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50' 
                  />
                </div>
              )}
              
              {selectedChat.username && (
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Username</label>
                  <input 
                    type='text' 
                    value={`@${selectedChat.username}`}
                    readOnly
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50' 
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Системные свойства */}
        <div>
          <h4 className='text-sm font-medium text-gray-900 mb-3'>Системные свойства</h4>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Тип чата</span>
              <span className='text-gray-900'>{getTypeLabel()}</span>
            </div>
            
            <div className='flex justify-between'>
              <span className='text-gray-500'>Статус</span>
              <span className='text-gray-900'>
                {selectedChat.status === 'active' ? 'Активен' : 
                 selectedChat.status === 'inactive' ? 'Неактивен' : 'Заблокирован'}
              </span>
            </div>
            
            {selectedChat.last_message_date && (
              <div className='flex justify-between'>
                <span className='text-gray-500'>Последняя активность</span>
                <span className='text-gray-900'>
                  {new Date(selectedChat.last_message_date).toLocaleString('ru-RU')}
                </span>
              </div>
            )}
            
            {selectedChat.unread_count !== undefined && (
              <div className='flex justify-between'>
                <span className='text-gray-500'>Непрочитанные</span>
                <span className='text-gray-900'>{selectedChat.unread_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Последнее сообщение */}
        {selectedChat.last_message && (
          <div>
            <h4 className='text-sm font-medium text-gray-900 mb-3'>Последнее сообщение</h4>
            <div className='p-3 bg-gray-50 rounded-lg'>
              <p className='text-sm text-gray-800 mb-2'>{selectedChat.last_message}</p>
              {selectedChat.last_message_date && (
                <span className='text-xs text-gray-500'>
                  {new Date(selectedChat.last_message_date).toLocaleString('ru-RU')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Действия */}
        <div>
          <h4 className='text-sm font-medium text-gray-900 mb-3'>Действия</h4>
          <div className='space-y-2'>
            <button className='w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors'>
              Отметить как прочитанный
            </button>
            
            <button className='w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors'>
              Архивировать чат
            </button>
            
            <button className='w-full px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors'>
              Заблокировать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
