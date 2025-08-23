import { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Message, FilterOptions } from '../types';
import apiClient from '../lib/api';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // WebSocket соединение
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Инициализация WebSocket соединения
  const initializeWebSocket = useCallback(() => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket подключен');
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Ошибка обработки WebSocket сообщения:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket отключен');
        // Автоматическое переподключение через 5 секунд
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(initializeWebSocket, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
        setError('Ошибка WebSocket соединения');
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Ошибка инициализации WebSocket:', error);
    }
  }, []);

  // Обработка WebSocket сообщений
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'new_message':
        handleNewMessage(data.data);
        break;
      case 'chat_status_change':
        handleChatStatusChange(data.data);
        break;
      case 'chat_update':
        handleChatUpdate(data.data);
        break;
      case 'operator_status_change':
        handleOperatorStatusChange(data.data);
        break;
      default:
        console.log('Неизвестный тип WebSocket сообщения:', data.type);
    }
  }, []);

  // Обработка нового сообщения
  const handleNewMessage = useCallback(({ chatId, message }: { chatId: number; message: Message }) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          last_message: message,
          unread_count: chat.unread_count + 1,
          updated_at: new Date().toISOString()
        };
      }
      return chat;
    }));
  }, []);

  // Обработка изменения статуса чата
  const handleChatStatusChange = useCallback(({ chatId, status, operatorId }: { chatId: number; status: string; operatorId?: number }) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          status: status as any,
          operator_id: operatorId,
          updated_at: new Date().toISOString()
        };
      }
      return chat;
    }));
  }, []);

  // Обработка обновления чата
  const handleChatUpdate = useCallback(({ chatId, chat: chatData }: { chatId: number; chat: Chat }) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, ...chatData };
      }
      return chat;
    }));
  }, []);

  // Обработка изменения статуса оператора
  const handleOperatorStatusChange = useCallback(({ operatorId, status }: { operatorId: number; status: string }) => {
    // Здесь можно обновить статус оператора в UI
    console.log(`Оператор ${operatorId} изменил статус на: ${status}`);
  }, []);

  // Загрузка чатов
  const loadChats = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentPage = reset ? 1 : page;
      const response = await apiClient.getChats({
        ...filters,
        page: currentPage,
        limit: 20
      });
      
      if (reset) {
        setChats(response);
        setPage(1);
      } else {
        setChats(prev => [...prev, ...response]);
        setPage(currentPage + 1);
      }
      
      setHasMore(response.length === 20);
      setIsInitialized(true);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки чатов';
      setError(errorMessage);
      console.error('Ошибка загрузки чатов:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // Принятие чата в работу
  const takeChat = useCallback(async (chatId: number) => {
    try {
      const updatedChat = await apiClient.takeChat(chatId);
      
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? updatedChat : chat
      ));
      
      setSelectedChatId(chatId);
      return updatedChat;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка принятия чата';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Закрытие чата
  const closeChat = useCallback(async (chatId: number) => {
    try {
      const updatedChat = await apiClient.closeChat(chatId);
      
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? updatedChat : chat
      ));
      
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      
      return updatedChat;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка закрытия чата';
      setError(errorMessage);
      throw err;
    }
  }, [selectedChatId]);

  // Обновление фильтров
  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Выбор чата
  const selectChat = useCallback((chat: Chat) => {
    setSelectedChatId(chat.id);
    
    // Подписываемся на обновления чата через WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_to_chat',
        chatId: chat.id
      }));
    }
  }, []);

  // Отправка сообщения
  const sendMessage = useCallback(async (chatId: number, text: string, attachments?: File[]) => {
    try {
      const message = await apiClient.sendMessage(chatId, text, attachments);
      
      // Обновляем чат с новым сообщением
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            last_message: message,
            updated_at: new Date().toISOString()
          };
        }
        return chat;
      }));
      
      return message;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка отправки сообщения';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Инициализация при монтировании
  useEffect(() => {
    initializeWebSocket();
    loadChats(true);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Перезагрузка чатов при изменении фильтров
  useEffect(() => {
    if (isInitialized) {
      loadChats(true);
    }
  }, [filters, isInitialized]);

  return {
    chats,
    selectedChatId,
    loading,
    error,
    filters,
    hasMore,
    loadChats,
    takeChat,
    closeChat,
    updateFilters,
    resetFilters,
    selectChat,
    sendMessage,
    loadMore: () => loadChats(false)
  };
}
