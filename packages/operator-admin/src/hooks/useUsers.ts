import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'operator' | 'supervisor' | 'admin' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  permissions: string[];
  profile?: {
    phone?: string;
    department?: string;
    position?: string;
  };
}

export interface UserNote {
  id: string;
  conversationId: string;
  content: string;
  author: string;
  authorName: string;
  type: 'internal' | 'resolution' | 'followup';
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserHistory {
  id: string;
  type: 'support' | 'order' | 'complaint' | 'inquiry';
  date: string;
  status: 'resolved' | 'pending' | 'closed' | 'escalated';
  description: string;
  conversationId?: string;
}

export function useUsers() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [history, setHistory] = useState<UserHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка информации о пользователе
  const fetchUserInfo = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api(`/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserInfo(data.data);
        } else {
          setError(data.error || 'Ошибка загрузки информации о пользователе');
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка заметок пользователя
  const fetchUserNotes = useCallback(async (userId: string) => {
    try {
      setError(null);
      
      const response = await api(`/admin/users/${userId}/notes`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(data.data || []);
        } else {
          setError(data.error || 'Ошибка загрузки заметок');
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  }, []);

  // Загрузка заметок по ID диалога
  const fetchConversationNotes = useCallback(async (conversationId: string) => {
    try {
      setError(null);
      const response = await api(`/admin/conversations/${conversationId}/notes`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(data.data || []);
        } else {
          setError(data.error || 'Ошибка загрузки заметок диалога');
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  }, []);

  // Загрузка истории пользователя
  const fetchUserHistory = useCallback(async (userId: string) => {
    try {
      setError(null);
      
      const response = await api(`/admin/users/${userId}/history`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistory(data.data || []);
        } else {
          setError(data.error || 'Ошибка загрузки истории');
        }
      } else {
        setError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  }, []);

  // Создание новой заметки
  const createNote = useCallback(async (conversationId: string, content: string, type: UserNote['type'] = 'internal', isPrivate: boolean = false) => {
    try {
      setError(null);
      
      const response = await api(`/admin/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          type,
          isPrivate
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newNote: UserNote = {
            id: data.data.id,
            conversationId: data.data.conversationId,
            content: data.data.content,
            author: data.data.author,
            authorName: data.data.authorName,
            type: data.data.type,
            isPrivate: data.data.isPrivate,
            createdAt: data.data.createdAt,
            updatedAt: data.data.updatedAt
          };
          
          setNotes(prev => [...prev, newNote]);
          return { success: true, note: newNote };
        } else {
          setError(data.error || 'Ошибка создания заметки');
          return { success: false, error: data.error };
        }
      } else {
        const errorText = `HTTP ${response.status}: ${response.statusText}`;
        setError(errorText);
        return { success: false, error: errorText };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Обновление заметки
  const updateNote = useCallback(async (noteId: string, updates: Partial<UserNote>) => {
    try {
      setError(null);
      
      const response = await api(`/admin/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(prev => prev.map(note => 
            note.id === noteId 
              ? { ...note, ...data.data, updatedAt: data.data.updatedAt }
              : note
          ));
          return { success: true };
        } else {
          setError(data.error || 'Ошибка обновления заметки');
          return { success: false, error: data.error };
        }
      } else {
        const errorText = `HTTP ${response.status}: ${response.statusText}`;
        setError(errorText);
        return { success: false, error: errorText };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Удаление заметки
  const deleteNote = useCallback(async (noteId: string) => {
    try {
      setError(null);
      
      const response = await api(`/admin/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(prev => prev.filter(note => note.id !== noteId));
          return { success: true };
        } else {
          setError(data.error || 'Ошибка удаления заметки');
          return { success: false, error: data.error };
        }
      } else {
        const errorText = `HTTP ${response.status}: ${response.statusText}`;
        setError(errorText);
        return { success: false, error: errorText };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Загрузка всех данных пользователя
  const loadUserData = useCallback(async (userId: string) => {
    await Promise.all([
      fetchUserInfo(userId),
      fetchUserNotes(userId),
      fetchUserHistory(userId)
    ]);
  }, [fetchUserInfo, fetchUserNotes, fetchUserHistory]);

  // Очистка данных
  const clearUserData = useCallback(() => {
    setUserInfo(null);
    setNotes([]);
    setHistory([]);
    setError(null);
  }, []);

  return {
    // Состояние
    userInfo,
    notes,
    history,
    loading,
    error,
    
    // Действия
    fetchUserInfo,
    fetchUserNotes,
    fetchConversationNotes,
    fetchUserHistory,
    createNote,
    updateNote,
    deleteNote,
    loadUserData,
    clearUserData,
    
    // Утилиты
    clearError: () => setError(null),
  };
}
