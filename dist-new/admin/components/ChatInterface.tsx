'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import UserPanel from './UserPanel';
import ThemeToggle from './ThemeToggle';
import { ChatProvider } from '../context/ChatContext';

export default function ChatInterface() {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = (message: string) => {
    console.log('Отправка сообщения:', message);
  };

  return (
    <ChatProvider>
      {/* Переключатель темы */}
      <ThemeToggle />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex h-screen bg-gray-50 dark:bg-gray-900"
      >
        {/* Левая панель - Список чатов */}
        <Sidebar 
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId}
        />

        {/* Центральная область - Чат */}
        <ChatWindow 
          selectedChatId={selectedChatId}
          onSendMessage={handleSendMessage}
        />

        {/* Правая панель - Информация о пользователе */}
        <UserPanel 
          selectedChatId={selectedChatId}
        />
      </motion.div>
    </ChatProvider>
  );
}
