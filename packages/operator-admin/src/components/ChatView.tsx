import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, User } from '../types';
import { MessageList } from './MessageList';
import { ToolsPanel } from './ToolsPanel';
import { 
  SparklesIcon
} from '@heroicons/react/24/outline';

interface ChatViewProps {
  chat: Chat | null;
  onSendMessage: (text: string, attachments?: File[]) => void;
  onCloseChat: () => void;
  onCreateCase: () => void;
  onCopyLink: () => void;
  onCreateNote: (content: string, isInternal: boolean) => void;
  onImproveResponse: (text: string, isOperator: boolean) => void;
}

export function ChatView({
  chat,
  onSendMessage,
  onCloseChat,
  onCreateCase,
  onCopyLink,
  onCreateNote,
  onImproveResponse
}: ChatViewProps) {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (chat) {
      loadMessages(chat.id);
    }
  }, [chat]);

  const loadMessages = async (chatId: number) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`http://localhost:3000/api/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') || 'test-token-1' : 'test-token-1'}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }
      
      const messages = await response.json();
      setMessages(messages);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      // Fallback к пустому массиву в случае ошибки
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (text: string, attachments?: File[]) => {
    if (!chat || !text.trim()) return;

    try {
      // Отправляем сообщение через API
      const response = await fetch(`http://localhost:3000/api/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') || 'test-token-1' : 'test-token-1'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const newMessage = await response.json();
      
      // Добавляем сообщение в список
      setMessages(prev => [...prev, newMessage]);
      
      // Очищаем поле ввода
      setMessageText('');
      
      // Вызываем callback для уведомления родительского компонента
      await onSendMessage(text, attachments);
      
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    }
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-lg">Выберите чат для начала работы</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Заголовок чата */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {chat.user.avatar_url ? (
              <img
                src={chat.user.avatar_url}
                alt={chat.user.first_name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {chat.user.first_name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                {chat.user.first_name} {chat.user.last_name}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  chat.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                  chat.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {chat.status === 'waiting' ? 'Ожидает' :
                   chat.status === 'in_progress' ? 'В работе' : 'Закрыт'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  chat.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  chat.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  chat.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {chat.priority === 'urgent' ? 'Срочно' :
                   chat.priority === 'high' ? 'Высокий' :
                   chat.priority === 'medium' ? 'Средний' : 'Низкий'}
                </span>
                {chat.user.is_verified && (
                  <span className="text-blue-600 text-xs">✓ Верифицирован</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCopyLink}
              className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Скопировать ссылку на диалог"
            >
              Ссылка
            </button>
            <button
              onClick={onCreateCase}
              className="px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              title="Создать кейс"
            >
              Кейс
            </button>
            <button
              onClick={onCloseChat}
              className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Закрыть чат"
            >
              Закрыть
            </button>
          </div>
        </div>

        {/* Причина эскалации */}
        {chat.escalation_reason && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <SparklesIcon className="w-4 h-4" />
              <span className="font-medium">Причина передачи оператору:</span>
              <span>{chat.escalation_reason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Список сообщений */}
      <MessageList
        messages={messages}
        loading={loadingMessages}
        currentOperatorId={1}
      />

      {/* Панель инструментов */}
      <ToolsPanel
        onSendMessage={handleSendMessage}
        onCreateNote={onCreateNote}
        onImproveResponse={onImproveResponse}
        currentMessageText={messageText}
        onMessageTextChange={setMessageText}
      />
    </div>
  );
}
