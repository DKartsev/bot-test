import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { connectSSE } from '../lib/stream';
import { useToast } from '../context/ToastContext';

export interface Chat {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'closed' | 'escalated';
  category: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  unreadCount?: number;
  customerName?: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'operator';
  timestamp: string;
  isRead: boolean;
  conversationId: string;
}

export interface ChatFilters {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChatFilters>({});
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { success, error: toastError } = useToast();

  // Восстановление фильтров из localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('chatFilters');
      if (raw) {
        const saved = JSON.parse(raw);
        setFilters(saved);
      }
    } catch {}
  }, []);

  // Сохранение фильтров
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('chatFilters', JSON.stringify(filters));
    } catch {}
  }, [filters]);

  // Загрузка списка чатов
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api('/admin/conversations');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChats(data.data || []);
        } else {
          setError(data.error || 'Ошибка загрузки чатов');
          toastError('Ошибка', data.error || 'Ошибка загрузки чатов');
        }
      } else {
        const msg = `HTTP ${response.status}: ${response.statusText}`;
        setError(msg);
        toastError('Ошибка', msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(msg);
      toastError('Ошибка', msg);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  // Загрузка сообщений для конкретного чата
  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      setError(null);
      
      const response = await api(`/admin/conversations/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.data || []);
        } else {
          setError(data.error || 'Ошибка загрузки сообщений');
          toastError('Ошибка', data.error || 'Ошибка загрузки сообщений');
        }
      } else {
        const msg = `HTTP ${response.status}: ${response.statusText}`;
        setError(msg);
        toastError('Ошибка', msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(msg);
      toastError('Ошибка', msg);
    }
  }, [toastError]);

  // Отправка сообщения
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    try {
      setError(null);
      
      const response = await api(`/admin/conversations/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          role: 'operator'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Добавляем новое сообщение в список
          const newMessage: Message = {
            id: data.data.id,
            content: data.data.content,
            role: data.data.role,
            timestamp: data.data.timestamp,
            isRead: false,
            conversationId: chatId
          };
          
          setMessages(prev => [...prev, newMessage]);
          
          // Обновляем чат: последнее сообщение, время и сбрасываем непрочитанные
          setChats(prev => prev.map(chat => 
            chat.id === chatId 
              ? { ...chat, lastMessage: content, updatedAt: new Date().toISOString(), unreadCount: 0 }
              : chat
          ));

          if (selectedChat?.id === chatId) {
            setSelectedChat(prev => prev ? { ...prev, lastMessage: content, updatedAt: new Date().toISOString(), unreadCount: 0 } : null);
          }

          // Синхроним прочитанное с backend (не блокируем UI)
          api(`/admin/conversations/${chatId}/read`, { method: 'PATCH' }).catch(() => {});

          success('Сообщение отправлено');
          
          return { success: true, message: newMessage };
        } else {
          setError(data.error || 'Ошибка отправки сообщения');
          toastError('Ошибка', data.error || 'Ошибка отправки сообщения');
          return { success: false, error: data.error };
        }
      } else {
        const msg = `HTTP ${response.status}: ${response.statusText}`;
        setError(msg);
        toastError('Ошибка', msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toastError('Ошибка', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [selectedChat, success, toastError]);

  // Обновление статуса чата
  const updateChatStatus = useCallback(async (chatId: string, status: Chat['status']) => {
    try {
      setError(null);
      
      const response = await api(`/admin/conversations/${chatId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Обновляем статус в списке чатов
          setChats(prev => prev.map(chat => 
            chat.id === chatId 
              ? { ...chat, status, updatedAt: data.data.updatedAt }
              : chat
          ));
          
          // Обновляем выбранный чат
          if (selectedChat?.id === chatId) {
            setSelectedChat(prev => prev ? { ...prev, status, updatedAt: data.data.updatedAt } : null);
          }

          success('Статус обновлен');
          
          return { success: true };
        } else {
          setError(data.error || 'Ошибка обновления статуса');
          toastError('Ошибка', data.error || 'Ошибка обновления статуса');
          return { success: false, error: data.error };
        }
      } else {
        const msg = `HTTP ${response.status}: ${response.statusText}`;
        setError(msg);
        toastError('Ошибка', msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toastError('Ошибка', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [selectedChat, success, toastError]);

  // Выбор чата
  const selectChat = useCallback(async (chat: Chat) => {
    setSelectedChat(chat);
    await fetchMessages(chat.id);
  }, [fetchMessages]);

  // Применение фильтров
  const applyFilters = useCallback((newFilters: ChatFilters) => {
    setFilters(newFilters);
  }, []);

  // Фильтрация чатов
  const filteredChats = chats.filter(chat => {
    if (filters.status && chat.status !== filters.status) return false;
    if (filters.category && chat.category !== filters.category) return false;
    if (filters.priority && chat.priority !== filters.priority) return false;
    if (filters.assignedTo && chat.assignedTo !== filters.assignedTo) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        chat.title.toLowerCase().includes(searchLower) ||
        chat.customerName?.toLowerCase().includes(searchLower) ||
        chat.lastMessage?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  // SSE обновления
  useEffect(() => {
    const es = connectSSE();

    const onUserMsg = (evt: Event) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data || '{}');
        const conversationId: string | undefined = data.conversationId || data.conversation_id || data.chatId;
        const content: string = data.content || '';
        const role: Message['role'] = (data.role as any) || 'user';
        const id: string = data.id || String(Date.now());
        const timestamp: string = data.timestamp || new Date().toISOString();

        if (!conversationId) return;

        // Обновление списка чатов
        setChats(prev => prev.map(chat => 
          chat.id === conversationId
            ? {
                ...chat,
                lastMessage: content || chat.lastMessage,
                updatedAt: new Date().toISOString(),
                unreadCount: selectedChat?.id === conversationId ? chat.unreadCount : (chat.unreadCount || 0) + 1,
              }
            : chat
        ));

        // Добавляем сообщение, если открыт выбранный чат
        if (selectedChat?.id === conversationId) {
          setMessages(prev => [
            ...prev,
            { id, content, role, timestamp, isRead: false, conversationId }
          ]);
        }
      } catch {}
    };

    const onAssigned = async (_evt: Event) => {
      try {
        await fetchChats();
      } catch {}
    };

    const onStatusChanged = (evt: Event) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data || '{}');
        const conversationId: string | undefined = data.conversationId || data.conversation_id || data.chatId;
        const status: Chat['status'] | undefined = data.status;
        if (!conversationId || !status) return;
        setChats(prev => prev.map(chat => chat.id === conversationId ? { ...chat, status, updatedAt: new Date().toISOString() } : chat));
        if (selectedChat?.id === conversationId) {
          setSelectedChat(prev => prev ? { ...prev, status, updatedAt: new Date().toISOString() } : null);
        }
      } catch {}
    };

    es.addEventListener('user_msg', onUserMsg as any);
    es.addEventListener('assigned', onAssigned as any);
    es.addEventListener('status_changed', onStatusChanged as any);

    return () => {
      try {
        es.removeEventListener('user_msg', onUserMsg as any);
        es.removeEventListener('assigned', onAssigned as any);
        es.removeEventListener('status_changed', onStatusChanged as any);
        es.close();
      } catch {}
    };
  }, [selectedChat?.id, fetchChats]);

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    // Состояние
    chats: filteredChats,
    selectedChat,
    messages,
    loading,
    error,
    filters,
    
    // Действия
    fetchChats,
    fetchMessages,
    sendMessage,
    updateChatStatus,
    selectChat,
    applyFilters,
    
    // Утилиты
    clearError: () => setError(null),
  };
}
