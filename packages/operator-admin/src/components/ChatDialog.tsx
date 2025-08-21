'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Chat, Message } from '../types/chat';
import { 
  Copy, 
  FileText, 
  Bot, 
  User, 
  MessageCircle,
  Pin,
  Star,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ChatDialogProps {
  chat: Chat | null;
}

export function ChatDialog({ chat }: ChatDialogProps) {
  const { acceptChat, copyChatLink, createCase } = useChat();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCreateCaseModal, setShowCreateCaseModal] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.last_message]);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-text-secondary">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-text-muted" />
          <h3 className="text-lg font-medium mb-2">Выберите чат</h3>
          <p className="text-sm">Выберите чат из списка слева для начала работы</p>
        </div>
      </div>
    );
  }

  const handleAcceptChat = () => {
    acceptChat(chat.id, 'current-operator-id');
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    // Здесь будет логика отправки сообщения
    console.log('Sending message:', messageText);
    setMessageText('');
  };

  const handleCreateCase = () => {
    if (caseTitle.trim() && caseDescription.trim()) {
      createCase(chat.id, caseTitle, caseDescription);
      setCaseTitle('');
      setCaseDescription('');
      setShowCreateCaseModal(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStyle = (message: Message) => {
    switch (message.author) {
      case 'bot':
        return 'bg-status-bot border-l-4 border-blue-400';
      case 'user':
        return 'bg-status-user border-l-4 border-green-400';
      case 'operator':
        return 'bg-status-operator border-l-4 border-yellow-400';
      default:
        return 'bg-white border-l-4 border-gray-400';
    }
  };

  const getMessageIcon = (message: Message) => {
    switch (message.author) {
      case 'bot':
        return <Bot className="w-4 h-4 text-blue-500" />;
      case 'user':
        return <User className="w-4 h-4 text-green-500" />;
      case 'operator':
        return <MessageCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Заголовок чата */}
      <div className="bg-white border-b border-border-light p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
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
            
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{chat.user.name}</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full border ${
                  chat.status === 'new' ? 'bg-red-100 text-red-800 border-red-200' :
                  chat.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                  {chat.status === 'new' && 'Новый'}
                  {chat.status === 'in_progress' && 'В работе'}
                  {chat.status === 'closed' && 'Закрыт'}
                </span>
                
                {chat.user.is_vip && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    VIP
                  </span>
                )}
                
                {chat.is_pinned && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center">
                    <Pin className="w-3 h-3 mr-1" />
                    Закреплен
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyChatLink(chat.id)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-button transition-colors"
              title="Скопировать ссылку"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowCreateCaseModal(true)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-button transition-colors"
              title="Создать кейс"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Индикатор эскалации */}
        {chat.escalation_reason && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-button p-3">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Передан оператору</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">{chat.escalation_reason}</p>
          </div>
        )}

        {/* Кнопка принятия чата */}
        {chat.status === 'new' && (
          <div className="mt-3">
            <button
              onClick={handleAcceptChat}
              className="px-4 py-2 bg-accent-blue text-white text-sm rounded-button hover:bg-accent-blue-dark transition-colors flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Принять чат</span>
            </button>
          </div>
        )}
      </div>

      {/* Лента сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Здесь будут сообщения */}
        <div className="text-center text-text-secondary text-sm">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-text-muted" />
          <p>История сообщений будет загружена здесь</p>
        </div>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Панель ввода сообщения */}
      {chat.status === 'in_progress' && (
        <div className="bg-white border-t border-border-light p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Введите сообщение..."
                className="w-full p-3 border border-border-light rounded-button resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="px-6 py-3 bg-accent-blue text-white rounded-button hover:bg-accent-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отправить
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно создания кейса */}
      {showCreateCaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-card shadow-card-hover w-96 p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Создать кейс</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Заголовок
                </label>
                <input
                  type="text"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  className="w-full p-2 border border-border-light rounded-button focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  placeholder="Краткое описание проблемы"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Описание
                </label>
                <textarea
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  className="w-full p-2 border border-border-light rounded-button resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  rows={4}
                  placeholder="Подробное описание проблемы..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateCaseModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Отмена
              </button>
              
              <button
                onClick={handleCreateCase}
                disabled={!caseTitle.trim() || !caseDescription.trim()}
                className="px-4 py-2 bg-accent-blue text-white rounded-button hover:bg-accent-blue-dark disabled:opacity-50 transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
