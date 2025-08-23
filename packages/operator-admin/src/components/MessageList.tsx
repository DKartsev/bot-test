import React, { useEffect, useRef } from 'react';
import { Message, Attachment } from '../types';
import { 
  PaperClipIcon, 
  DocumentIcon, 
  PhotoIcon, 
  VideoCameraIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentOperatorId?: number;
}

export function MessageList({ messages, loading, currentOperatorId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStyle = (authorType: string) => {
    switch (authorType) {
      case 'bot':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'user':
        return 'bg-white border-gray-200 text-gray-900';
      case 'operator':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getAuthorLabel = (authorType: string) => {
    switch (authorType) {
      case 'bot':
        return '🤖 Бот';
      case 'user':
        return '👤 Пользователь';
      case 'operator':
        return '👨‍💼 Оператор';
      default:
        return '❓ Неизвестно';
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="w-4 h-4" />;
      case 'video':
        return <VideoCameraIcon className="w-4 h-4" />;
      case 'audio':
        return <MusicalNoteIcon className="w-4 h-4" />;
      case 'document':
        return <DocumentIcon className="w-4 h-4" />;
      default:
        return <PaperClipIcon className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Загрузка сообщений...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-gray-500">
          <p>История сообщений пуста</p>
          <p className="text-sm">Начните диалог, отправив первое сообщение</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.author_type === 'operator' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs lg:max-w-md xl:max-w-lg p-3 rounded-lg border ${getMessageStyle(
              message.author_type
            )}`}
          >
            {/* Заголовок сообщения */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-75">
                {getAuthorLabel(message.author_type)}
              </span>
              <span className="text-xs opacity-75">
                {formatTime(message.timestamp)}
              </span>
            </div>

            {/* Текст сообщения */}
            <div className="mb-2">
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>

            {/* Вложения */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center space-x-2 p-2 bg-white bg-opacity-50 rounded border"
                  >
                    {getAttachmentIcon(attachment.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{attachment.filename}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                    </div>
                    <button
                      onClick={() => window.open(attachment.url, '_blank')}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Метаданные */}
            {message.metadata && (
              <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                <div className="text-xs opacity-75 space-y-1">
                  {message.metadata.confidence && (
                    <div>Уверенность: {Math.round(message.metadata.confidence * 100)}%</div>
                  )}
                  {message.metadata.intent && (
                    <div>Намерение: {message.metadata.intent}</div>
                  )}
                  {message.metadata.source && (
                    <div>Источник: {message.metadata.source}</div>
                  )}
                </div>
              </div>
            )}

            {/* Статус прочтения */}
            {message.author_type === 'operator' && (
              <div className="mt-2 text-right">
                <span className="text-xs opacity-75">
                  {message.is_read ? '✓ Прочитано' : '○ Отправлено'}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
