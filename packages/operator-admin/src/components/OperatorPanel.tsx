'use client';

import React, { useState, useEffect } from 'react';
import { ChatProvider, useChat } from '../context/ChatContext';
import { ToastProvider, useToast } from '../context/ToastContext';
import { ChatList } from './ChatList';
import { ChatDialog } from './ChatDialog';
import { ToolsPanel } from './ToolsPanel';
import { UserInfoPanel } from './UserInfoPanel';
import { FiltersOverlay } from './FiltersOverlay';
import { ToastContainer } from './Toast';
import { Chat } from '../types/chat';

// Заглушки для тестовых данных
const mockChats: Chat[] = [
  {
    id: '1',
    user: {
      id: 'user-1',
      name: 'Александр Петров',
      avatar_url: undefined,
      balance: 15000,
      deals_count: 45,
      flags: ['verified', 'premium'],
      holds: ['pending_verification'],
      is_blocked: false,
      is_vip: true,
    },
    last_message: {
      id: 'msg-1',
      author: 'user',
      role: 'user',
      text: 'Платеж не пришел, что делать?',
      timestamp: new Date(Date.now() - 300000),
      status: 'read',
    },
    status: 'new',
    priority: 'high',
    source: 'telegram',
    category: 'payment',
    unread_count: 1,
    is_pinned: false,
    is_important: true,
    created_at: new Date(Date.now() - 600000),
    updated_at: new Date(Date.now() - 300000),
    has_attachments: false,
    escalation_reason: 'Ключевое слово "платеж не пришел"',
  },
  {
    id: '2',
    user: {
      id: 'user-2',
      name: 'Мария Сидорова',
      avatar_url: undefined,
      balance: 5000,
      deals_count: 12,
      flags: ['new_user'],
      holds: [],
      is_blocked: false,
      is_vip: false,
    },
    last_message: {
      id: 'msg-2',
      author: 'bot',
      role: 'bot',
      text: 'Как верифицировать аккаунт?',
      timestamp: new Date(Date.now() - 600000),
      status: 'read',
    },
    status: 'in_progress',
    priority: 'medium',
    source: 'website',
    category: 'verification',
    unread_count: 0,
    is_pinned: false,
    is_important: false,
    assigned_operator: 'current-operator-id',
    created_at: new Date(Date.now() - 1200000),
    updated_at: new Date(Date.now() - 600000),
    has_attachments: true,
  },
  {
    id: '3',
    user: {
      id: 'user-3',
      name: 'Дмитрий Козлов',
      avatar_url: undefined,
      balance: 25000,
      deals_count: 78,
      flags: ['verified', 'trusted'],
      holds: [],
      is_blocked: false,
      is_vip: true,
    },
    last_message: {
      id: 'msg-3',
      author: 'user',
      role: 'user',
      text: 'Хочу поговорить с оператором',
      timestamp: new Date(Date.now() - 900000),
      status: 'read',
    },
    status: 'new',
    priority: 'urgent',
    source: 'p2p',
    category: 'general',
    unread_count: 2,
    is_pinned: true,
    is_important: true,
    created_at: new Date(Date.now() - 1800000),
    updated_at: new Date(Date.now() - 900000),
    has_attachments: false,
    escalation_reason: 'Запрос оператора',
  },
];

function OperatorPanelContent() {
  const { state, dispatch } = useChat();
  const { addToast, toasts, removeToast } = useToast();
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);

  // Загрузка тестовых данных
  useEffect(() => {
    dispatch({ type: 'SET_CHATS', payload: mockChats });
  }, [dispatch]);

  const handleChatSelect = (chat: Chat) => {
    setCurrentChat(chat);
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    addToast('info', 'Чат выбран', `Открыт чат с ${chat.user.name}`);
  };

  const handleNoteAdd = (note: string) => {
    console.log('Adding note:', note);
    // Здесь будет логика добавления заметки
  };

  const handleTemplateSelect = (template: string) => {
    console.log('Selected template:', template);
    // Здесь будет логика вставки шаблона в поле сообщения
  };

  const handleInstructionSelect = (instruction: string) => {
    console.log('Selected instruction:', instruction);
    // Здесь будет логика отображения инструкции
  };

  const handleFileAttach = (file: File) => {
    console.log('Attaching file:', file.name);
    // Здесь будет логика прикрепления файла
  };

  const handleImproveResponse = (isOperator: boolean) => {
    console.log('Improving response, operator mode:', isOperator);
    // Здесь будет логика улучшения ответа с помощью AI
  };

  const handleFiltersClose = () => {
    dispatch({ type: 'TOGGLE_FILTERS' });
  };

  return (
    <>
      <div className="flex h-screen bg-background">
        {/* Левая колонка - список чатов */}
        <div className="w-88 flex-shrink-0">
          <ChatList onChatSelect={handleChatSelect} />
        </div>

        {/* Центральная колонка - диалог */}
        <div className="flex-1 flex flex-col">
          <ChatDialog chat={currentChat} />
          {currentChat && (
            <ToolsPanel
              onNoteAdd={handleNoteAdd}
              onTemplateSelect={handleTemplateSelect}
              onInstructionSelect={handleInstructionSelect}
              onFileAttach={handleFileAttach}
              onImproveResponse={handleImproveResponse}
            />
          )}
        </div>

        {/* Правая колонка - информация о пользователе */}
        <UserInfoPanel user={currentChat?.user || null} />

        {/* Оверлей фильтров */}
        <FiltersOverlay
          isOpen={state.isFiltersOpen}
          onClose={handleFiltersClose}
        />
      </div>

      {/* Уведомления */}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />
    </>
  );
}

export function OperatorPanel() {
  return (
    <ToastProvider>
      <ChatProvider>
        <OperatorPanelContent />
      </ChatProvider>
    </ToastProvider>
  );
}
