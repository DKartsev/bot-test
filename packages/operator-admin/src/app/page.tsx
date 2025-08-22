'use client';

import React, { useState, useEffect } from 'react';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { UserPanel } from '../components/UserPanel';
import { useChats } from '../hooks/useChats';
import { Chat, User } from '../types';
import apiClient from '../lib/api';

export default function OperatorPanel() {
  const {
    chats,
    loading,
    error,
    filters,
    selectedChatId,
    setSelectedChatId,
    takeChat,
    closeChat,
    updateFilters,
    resetFilters,
    loadChats
  } = useChats();

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Загрузка выбранного чата
  useEffect(() => {
    if (selectedChatId) {
      const chat = chats.find(c => c.id === selectedChatId);
      if (chat) {
        setSelectedChat(chat);
        setCurrentUser(chat.user);
      }
    } else {
      setSelectedChat(null);
      setCurrentUser(null);
    }
  }, [selectedChatId, chats]);

  // Обработка выбора чата
  const handleSelectChat = (chat: Chat) => {
    setSelectedChatId(chat.id);
  };

  // Обработка принятия чата
  const handleTakeChat = async (chatId: number) => {
    try {
      await takeChat(chatId);
      addNotification('Чат успешно принят в работу');
    } catch (err) {
      addNotification('Ошибка при принятии чата');
    }
  };

  // Обработка закрытия чата
  const handleCloseChat = async () => {
    if (selectedChat) {
      try {
        await closeChat(selectedChat.id);
        addNotification('Чат успешно закрыт');
      } catch (err) {
        addNotification('Ошибка при закрытии чата');
      }
    }
  };

  // Отправка сообщения
  const handleSendMessage = async (text: string, attachments?: File[]) => {
    if (selectedChat) {
      try {
        // Имитация отправки сообщения
        await new Promise(resolve => setTimeout(resolve, 500));
        addNotification('Сообщение отправлено');
        // Обновляем чат после отправки
        loadChats();
      } catch (err) {
        addNotification('Ошибка при отправке сообщения');
      }
    }
  };

  // Создание кейса
  const handleCreateCase = () => {
    if (selectedChat) {
      addNotification('Функция создания кейса будет реализована позже');
    }
  };

  // Копирование ссылки
  const handleCopyLink = () => {
    if (selectedChat) {
      const link = `${window.location.origin}/chat/${selectedChat.id}`;
      navigator.clipboard.writeText(link);
      addNotification('Ссылка скопирована в буфер обмена');
    }
  };

  // Действия с пользователем
  const handleOpenProfile = () => {
    if (currentUser) {
      addNotification('Функция просмотра профиля будет реализована позже');
    }
  };

  const handleBlockUser = () => {
    if (currentUser) {
      addNotification('Функция блокировки пользователя будет реализована позже');
    }
  };

  const handleUnblockUser = () => {
    if (currentUser) {
      addNotification('Функция разблокировки пользователя будет реализована позже');
    }
  };

  const handleCreateRefund = () => {
    if (currentUser) {
      addNotification('Функция создания возврата будет реализована позже');
    }
  };

  const handleViewHistory = () => {
    if (currentUser) {
      addNotification('Функция просмотра истории будет реализована позже');
    }
  };

  // Управление уведомлениями
  const addNotification = (message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, `${id}: ${message}`]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => !n.startsWith(`${id}:`)));
    }, 3000);
  };

  // Обработка ошибок
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка загрузки</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadChats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">О</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Панель операторов</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Активных чатов: {chats.filter(c => c.status === 'waiting').length}
            </div>
            <div className="text-sm text-gray-600">
              В работе: {chats.filter(c => c.status === 'in_progress').length}
            </div>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Левая колонка - список чатов */}
        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onTakeChat={handleTakeChat}
          filters={filters}
          onUpdateFilters={updateFilters}
          onResetFilters={resetFilters}
          loading={loading}
        />

        {/* Центральная колонка - просмотр чата */}
        <ChatView
          chat={selectedChat}
          onSendMessage={handleSendMessage}
          onCloseChat={handleCloseChat}
          onCreateCase={handleCreateCase}
          onCopyLink={handleCopyLink}
        />

        {/* Правая колонка - информация о пользователе */}
        <UserPanel
          user={currentUser}
          onOpenProfile={handleOpenProfile}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          onCreateRefund={handleCreateRefund}
          onViewHistory={handleViewHistory}
        />
      </div>

      {/* Уведомления */}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 max-w-sm fade-in"
            >
              <p className="text-sm text-gray-900">{notification.split(': ')[1]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
