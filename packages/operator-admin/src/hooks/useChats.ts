import { useState, useEffect, useCallback } from 'react';
import { Chat, Message, FilterOptions } from '../types';
import { getMockChats, getMockChatMessages } from '../lib/mockData';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);

  // Загрузка чатов
  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMockChats();
      setChats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки чатов');
    } finally {
      setLoading(false);
    }
  }, []);

  // Принятие чата в работу
  const takeChat = useCallback(async (chatId: number) => {
    try {
      // Имитация API вызова
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, status: 'in_progress', operator_id: 1 }
          : chat
      ));
      setSelectedChatId(chatId);
      
      return chats.find(chat => chat.id === chatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка принятия чата');
      throw err;
    }
  }, [chats]);

  // Закрытие чата
  const closeChat = useCallback(async (chatId: number) => {
    try {
      // Имитация API вызова
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, status: 'closed', operator_id: undefined }
          : chat
      ));
      
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      
      return chats.find(chat => chat.id === chatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка закрытия чата');
      throw err;
    }
  }, [selectedChatId, chats]);

  // Обновление фильтров
  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Имитация real-time обновлений
  useEffect(() => {
    const interval = setInterval(() => {
      // Случайно обновляем статус чатов для демонстрации
      setChats(prev => prev.map(chat => {
        if (Math.random() < 0.1 && chat.status === 'waiting') {
          return {
            ...chat,
            unread_count: chat.unread_count + 1,
            updated_at: new Date().toISOString()
          };
        }
        return chat;
      }));
    }, 10000); // Каждые 10 секунд

    return () => clearInterval(interval);
  }, []);

  // Загрузка чатов при монтировании
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return {
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
    loadChats,
  };
}
