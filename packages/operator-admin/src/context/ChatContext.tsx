'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Chat, Message, ChatFilters, User } from '../types/chat';

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  filters: ChatFilters;
  isFiltersOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
  | { type: 'UPDATE_CHAT'; payload: { id: string; updates: Partial<Chat> } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'SET_FILTERS'; payload: ChatFilters }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'MARK_CHAT_READ'; payload: string }
  | { type: 'ASSIGN_CHAT'; payload: { chatId: string; operatorId: string } };

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  filters: {},
  isFiltersOpen: false,
  isLoading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload };
    
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.id
            ? { ...chat, ...action.payload.updates }
            : chat
        ),
        currentChat: state.currentChat?.id === action.payload.id
          ? { ...state.currentChat, ...action.payload.updates }
          : state.currentChat,
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? {
                ...chat,
                last_message: action.payload.message,
                unread_count: chat.unread_count + 1,
                updated_at: new Date(),
              }
            : chat
        ),
        currentChat: state.currentChat?.id === action.payload.chatId
          ? {
              ...state.currentChat,
              last_message: action.payload.message,
              unread_count: state.currentChat.unread_count + 1,
              updated_at: new Date(),
            }
          : state.currentChat,
      };
    
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'TOGGLE_FILTERS':
      return { ...state, isFiltersOpen: !state.isFiltersOpen };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'MARK_CHAT_READ':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload
            ? { ...chat, unread_count: 0 }
            : chat
        ),
        currentChat: state.currentChat?.id === action.payload
          ? { ...state.currentChat, unread_count: 0 }
          : state.currentChat,
      };
    
    case 'ASSIGN_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? { ...chat, assigned_operator: action.payload.operatorId, status: 'in_progress' }
            : chat
        ),
        currentChat: state.currentChat?.id === action.payload.chatId
          ? { ...state.currentChat, assigned_operator: action.payload.operatorId, status: 'in_progress' }
          : state.currentChat,
      };
    
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  filteredChats: Chat[];
  acceptChat: (chatId: string, operatorId: string) => void;
  sendMessage: (chatId: string, text: string) => void;
  copyChatLink: (chatId: string) => void;
  createCase: (chatId: string, title: string, description: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Фильтрация чатов на основе активных фильтров
  const filteredChats = React.useMemo(() => {
    let filtered = [...state.chats];

    if (state.filters.status?.length) {
      filtered = filtered.filter(chat => state.filters.status!.includes(chat.status));
    }

    if (state.filters.source?.length) {
      filtered = filtered.filter(chat => state.filters.source!.includes(chat.source));
    }

    if (state.filters.priority?.length) {
      filtered = filtered.filter(chat => state.filters.priority!.includes(chat.priority));
    }

    if (state.filters.category?.length) {
      filtered = filtered.filter(chat => state.filters.category!.includes(chat.category));
    }

    if (state.filters.has_attachments !== undefined) {
      filtered = filtered.filter(chat => chat.has_attachments === state.filters.has_attachments);
    }

    if (state.filters.assigned_to_me) {
      filtered = filtered.filter(chat => chat.assigned_operator === 'current-operator-id');
    }

    // Сортировка: новые сверху, затем по приоритету
    return filtered.sort((a, b) => {
      if (a.status === 'new' && b.status !== 'new') return -1;
      if (b.status === 'new' && a.status !== 'new') return 1;
      
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [state.chats, state.filters]);

  const acceptChat = (chatId: string, operatorId: string) => {
    dispatch({ type: 'ASSIGN_CHAT', payload: { chatId, operatorId } });
  };

  const sendMessage = (chatId: string, text: string) => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      author: 'operator',
      role: 'operator',
      text,
      timestamp: new Date(),
      status: 'sent',
    };

    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message } });
  };

  const copyChatLink = (chatId: string) => {
    const link = `${window.location.origin}/chat/${chatId}`;
    navigator.clipboard.writeText(link);
    // Здесь можно добавить toast уведомление
  };

  const createCase = (chatId: string, title: string, description: string) => {
    // Логика создания кейса
    console.log('Creating case:', { chatId, title, description });
  };

  const value: ChatContextType = {
    state,
    dispatch,
    filteredChats,
    acceptChat,
    sendMessage,
    copyChatLink,
    createCase,
  };

  return (
    <ChatContext.Provider value={value}>
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
