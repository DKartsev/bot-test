'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { telegramAPI, TelegramChat, TelegramMessage } from '../lib/telegram-api';

interface ChatContextType {
  chats: TelegramChat[];
  selectedChat: TelegramChat | null;
  messages: TelegramMessage[];
  loading: boolean;
  error: string | null;
  selectChat: (chat: TelegramChat) => void;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  fetchChats: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TelegramChat | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка списка чатов
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const telegramChats = await telegramAPI.getChats();
      setChats(telegramChats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки чатов';
      setError(errorMessage);
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка сообщений чата
  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      setError(null);
      const telegramMessages = await telegramAPI.getChatMessages(chatId, 100);
      setMessages(telegramMessages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки сообщений';
      setError(errorMessage);
      console.error('Error fetching messages:', err);
    }
  }, []);

  // Отправка сообщения
  const sendMessage = useCallback(async (chatId: string, text: string) => {
    try {
      setError(null);
      
      // Отправляем сообщение через API
      const sentMessage = await telegramAPI.sendMessage({
        chat_id: chatId,
        text: text,
      });

      // Добавляем отправленное сообщение в список
      setMessages(prev => [sentMessage, ...prev]);

      // Обновляем информацию о чате
      if (selectedChat) {
        const updatedChat = await telegramAPI.getChatInfo(chatId);
        setChats(prev => prev.map(chat => 
          chat.id === chatId ? updatedChat : chat
        ));
        setSelectedChat(updatedChat);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка отправки сообщения';
      setError(errorMessage);
      console.error('Error sending message:', err);
      throw err; // Пробрасываем ошибку для обработки в UI
    }
  }, [selectedChat]);

  // Выбор чата
  const selectChat = useCallback((chat: TelegramChat) => {
    setSelectedChat(chat);
    fetchMessages(chat.id);
  }, [fetchMessages]);

  // Обновление сообщений
  const refreshMessages = useCallback(async () => {
    if (selectedChat) {
      await fetchMessages(selectedChat.id);
    }
  }, [selectedChat, fetchMessages]);

  // Автоматическое обновление чатов каждые 30 секунд
  useEffect(() => {
    fetchChats();
    
    const interval = setInterval(fetchChats, 30000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Автоматическое обновление сообщений каждые 10 секунд для выбранного чата
  useEffect(() => {
    if (selectedChat) {
      const interval = setInterval(() => {
        fetchMessages(selectedChat.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedChat, fetchMessages]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        selectedChat,
        messages,
        loading,
        error,
        selectChat,
        sendMessage,
        fetchChats,
        refreshMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
