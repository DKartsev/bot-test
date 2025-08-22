'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { TelegramMessage } from '../lib/telegram-api';

export function ChatWindow() {
  const { selectedChat, messages, sendMessage, error } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоматическая прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

    try {
      setSending(true);
      await sendMessage(selectedChat.id, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      // Ошибка уже обработана в ChatContext
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long' 
      });
    }
  };

  if (!selectedChat) {
    return (
      <div className='flex-1 bg-white flex items-center justify-center'>
        <div className='text-center text-gray-500'>
          <svg className='w-16 h-16 mx-auto mb-4 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
          </svg>
          <p className='text-lg font-medium'>Выберите чат для начала работы</p>
          <p className='text-sm'>Выберите чат из списка слева, чтобы просмотреть сообщения</p>
        </div>
      </div>
    );
  }

  // Группируем сообщения по дате
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, TelegramMessage[]>);

  return (
    <div className='flex-1 bg-white flex flex-col'>
      {/* Заголовок чата */}
      <div className='p-4 border-b border-gray-200 bg-gray-50'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-gray-900'>
              {selectedChat.type === 'private' ? 
                (selectedChat.first_name && selectedChat.last_name ? 
                  `${selectedChat.first_name} ${selectedChat.last_name}` : 
                  selectedChat.first_name || selectedChat.username || selectedChat.title
                ) : 
                selectedChat.title
              }
            </h2>
            <p className='text-sm text-gray-500'>
              {selectedChat.type === 'private' ? 'Личный чат' : 'Группа'} • 
              {selectedChat.status === 'active' ? ' Активен' : 
               selectedChat.status === 'inactive' ? ' Неактивен' : ' Заблокирован'}
            </p>
          </div>
          
          <div className='flex items-center space-x-2'>
            {selectedChat.unread_count && selectedChat.unread_count > 0 && (
              <span className='px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full'>
                {selectedChat.unread_count} непрочитанных
              </span>
            )}
            
            <button 
              className='p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100'
              title='Обновить чат'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <div className='flex-1 overflow-y-auto p-4'>
        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-800 text-sm'>Ошибка: {error}</p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className='text-center text-gray-500 py-8'>
            <svg className='w-12 h-12 mx-auto mb-3 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
            </svg>
            <p>Нет сообщений в этом чате</p>
            <p className='text-sm'>Начните разговор, отправив первое сообщение</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Разделитель даты */}
                <div className='text-center text-xs text-gray-400 mb-4'>
                  {date}
                </div>
                
                {/* Сообщения за эту дату */}
                {dateMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_outgoing ? 'justify-end' : 'justify-start'} mb-3`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.is_outgoing
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className='text-sm whitespace-pre-wrap'>{message.text}</p>
                      <div className={`flex items-center justify-between mt-2 text-xs ${
                        message.is_outgoing ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span>{formatMessageTime(message.date)}</span>
                        {message.is_outgoing && (
                          <span className='ml-2'>
                            {sending ? '⏳' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        
        {/* Якорь для автоматической прокрутки */}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода сообщения */}
      <div className='p-4 border-t border-gray-200 bg-gray-50'>
        <div className='flex items-end space-x-3'>
          <div className='flex-1 relative'>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Введите сообщение... (Shift+Enter для новой строки)'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={sending}
            />
            
            {/* Счетчик символов */}
            <div className='absolute bottom-2 right-2 text-xs text-gray-400'>
              {newMessage.length}/4096
            </div>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              !newMessage.trim() || sending
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {sending ? (
              <div className='flex items-center space-x-2'>
                <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                <span>Отправка...</span>
              </div>
            ) : (
              'Отправить'
            )}
          </button>
        </div>
        
        <div className='mt-2 text-xs text-gray-500'>
          Нажмите Enter для отправки, Shift+Enter для новой строки
        </div>
      </div>
    </div>
  );
}
