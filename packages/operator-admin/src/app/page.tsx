'use client';

import React, { useState, useEffect } from 'react';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { UserPanel } from '../components/UserPanel';
import { Notifications, Notification } from '../components/Notifications';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { useChats } from '../hooks/useChats';
import { Chat, User } from '../types';
import apiClient from '../lib/api';

export default function OperatorPanel() {
  const {
    chats,
    selectedChatId,
    loading,
    error,
    filters,
    hasMore,
    useFallbackData,
    loadChats,
    takeChat,
    closeChat,
    updateFilters,
    resetFilters,
    selectChat,
    sendMessage,
    loadMore
  } = useChats();

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState('test@operator.com');
  const [loginPassword, setLoginPassword] = useState('test123');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const token = (globalThis as any).localStorage?.getItem('auth_token');
    setIsAuthenticated(Boolean(token));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await apiClient.login(loginEmail, loginPassword);
      setIsAuthenticated(true);
      loadChats(true);
    } catch (err) {
      setLoginError('Неверный email или пароль');
    }
  };

  // Загрузка выбранного чата
  useEffect(() => {
    if (selectedChatId) {
      const chat = chats.find(c => c.id === selectedChatId);
      setSelectedChat(chat || null);
    } else {
      setSelectedChat(null);
    }
  }, [selectedChatId, chats]);

  // Загрузка текущего пользователя
  useEffect(() => {
    if (selectedChat) {
      setCurrentUser(selectedChat.user);
    } else {
      setCurrentUser(null);
    }
  }, [selectedChat]);

  // Обработка выбора чата
  const handleSelectChat = (chat: Chat) => {
    selectChat(chat);
  };

  // Обработка принятия чата
  const handleTakeChat = async (chatId: number) => {
    try {
      await takeChat(chatId);
      addNotification('Чат принят в работу', 'success');
    } catch (err) {
      addNotification('Ошибка при принятии чата', 'error');
    }
  };

  // Обработка закрытия чата
  const handleCloseChat = async () => {
    if (selectedChat) {
      try {
        await closeChat(selectedChat.id);
        addNotification('Чат закрыт', 'success');
      } catch (err) {
        addNotification('Ошибка при закрытии чата', 'error');
      }
    }
  };

  // Обработка отправки сообщения
  const handleSendMessage = async (text: string, attachments?: File[]) => {
    if (selectedChat) {
      try {
        await sendMessage(selectedChat.id, text, attachments);
        addNotification('Сообщение отправлено', 'success');
      } catch (err) {
        addNotification('Ошибка при отправке сообщения', 'error');
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
      // Используем относительный путь вместо window.location.origin
      const link = `/chat/${selectedChat.id}`;
      addNotification(`Ссылка: ${link} (скопируйте вручную)`, 'info');
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

  // Создание заметки
  const handleCreateNote = async (content: string, isInternal: boolean) => {
    if (selectedChat) {
      try {
        // В реальном приложении здесь будет API вызов
        await new Promise(resolve => setTimeout(resolve, 300));
        addNotification(`Заметка ${isInternal ? 'внутренняя' : 'публичная'} создана`);
      } catch (err) {
        addNotification('Ошибка при создании заметки');
      }
    }
  };

  // Улучшение ответа
  const handleImproveResponse = async (text: string, isOperator: boolean) => {
    try {
      // В реальном приложении здесь будет API вызов к AI сервису
      await new Promise(resolve => setTimeout(resolve, 1000));
      addNotification(`Ответ улучшен ${isOperator ? '(операторский)' : '(AI)'}`);
    } catch (err) {
      addNotification('Ошибка при улучшении ответа');
    }
  };

  // Обработка обновления чатов
  const handleRefreshChats = () => {
    loadChats(true);
  };

  // Управление уведомлениями
  const addNotification = (message: string, type: Notification['type'] = 'info') => {
    const id = Date.now().toString();
    const notification: Notification = { id, type, message };
    setNotifications(prev => [...prev, notification]);
    
    // Автоматически удаляем уведомление через 5 секунд
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Экран логина
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Вход оператора</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="login-email">Email</label>
              <input id="login-email" aria-label="Email" placeholder="Введите email" value={loginEmail} onChange={(e) => setLoginEmail((e.target as any).value)} type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="login-password">Пароль</label>
              <input id="login-password" aria-label="Пароль" placeholder="Введите пароль" value={loginPassword} onChange={(e) => setLoginPassword((e.target as any).value)} type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            {loginError && <div className="text-sm text-red-600">{loginError}</div>}
            <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Войти</button>
          </form>
          <p className="text-xs text-gray-500 mt-3">Для теста: test@operator.com / test123</p>
        </div>
      </div>
    );
  }

  // Обработка ошибок
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка загрузки</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadChats(true)}
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
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Панель операторов</h1>
            {useFallbackData && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full border border-yellow-200">
                🔄 Демо режим (Backend недоступен)
              </div>
            )}
          </div>
          <ConnectionStatus />
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
          hasMore={hasMore}
          onLoadMore={loadMore}
        />

        {/* Центральная колонка - просмотр чата */}
        <ChatView
          chat={selectedChat}
          onSendMessage={handleSendMessage}
          onCloseChat={handleCloseChat}
          onCreateCase={handleCreateCase}
          onCopyLink={handleCopyLink}
          onCreateNote={handleCreateNote}
          onImproveResponse={handleImproveResponse}
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
      <Notifications notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}
