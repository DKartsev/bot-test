import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, User } from '../types';
import { 
  PaperClipIcon, 
  DocumentTextIcon, 
  BookOpenIcon, 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface ChatViewProps {
  chat: Chat | null;
  onSendMessage: (text: string, attachments?: File[]) => void;
  onCloseChat: () => void;
  onCreateCase: () => void;
  onCopyLink: () => void;
}

export function ChatView({
  chat,
  onSendMessage,
  onCloseChat,
  onCreateCase,
  onCopyLink
}: ChatViewProps) {
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.last_message]);

  const handleSendMessage = () => {
    if (messageText.trim() || attachments.length > 0) {
      onSendMessage(messageText, attachments);
      setMessageText('');
      setAttachments([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
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

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Здесь будут отображаться сообщения */}
        <div className="text-center text-gray-500">
          <p>История сообщений будет загружена здесь</p>
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Панель инструментов */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Прикрепить файл"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Заметка (внутренняя)"
          >
            <DocumentTextIcon className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Сохранённые ответы"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Инструкции"
          >
            <BookOpenIcon className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Улучшить ответ (AI)"
          >
            <SparklesIcon className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Улучшить ответ (Оператор)"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Вложения */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <span className="text-sm text-blue-800 truncate max-w-32">
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Удалить файл"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Поле ввода */}
        <div className="flex space-x-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() && attachments.length === 0}
            className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Отправить
          </button>
        </div>

        {/* Скрытый input для файлов */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          aria-label="Выбор файлов для прикрепления"
        />
      </div>
    </div>
  );
}
