import { Chat, User, Message } from '../types';

export const mockUsers: User[] = [
  {
    id: 1,
    telegram_id: 123456789,
    username: 'ivan_petrov',
    first_name: 'Иван',
    last_name: 'Петров',
    avatar_url: undefined,
    balance: 15420.50,
    deals_count: 23,
    flags: ['verified', 'vip'],
    is_blocked: false,
    is_verified: true,
    created_at: '2024-01-15T10:00:00Z',
    last_activity: '2024-01-20T14:30:00Z'
  },
  {
    id: 2,
    telegram_id: 987654321,
    username: 'maria_sidorova',
    first_name: 'Мария',
    last_name: 'Сидорова',
    avatar_url: undefined,
    balance: 8750.00,
    deals_count: 15,
    flags: ['verified'],
    is_blocked: false,
    is_verified: true,
    created_at: '2024-01-10T12:00:00Z',
    last_activity: '2024-01-20T16:45:00Z'
  },
  {
    id: 3,
    telegram_id: 555666777,
    username: 'alex_kuznetsov',
    first_name: 'Алексей',
    last_name: 'Кузнецов',
    avatar_url: undefined,
    balance: 0.00,
    deals_count: 0,
    flags: [],
    is_blocked: true,
    is_verified: false,
    created_at: '2024-01-05T08:00:00Z',
    last_activity: '2024-01-18T11:20:00Z'
  },
  {
    id: 4,
    telegram_id: 111222333,
    username: 'elena_ivanova',
    first_name: 'Елена',
    last_name: 'Иванова',
    avatar_url: undefined,
    balance: 25680.75,
    deals_count: 45,
    flags: ['verified', 'vip', 'premium'],
    is_blocked: false,
    is_verified: true,
    created_at: '2023-12-20T09:00:00Z',
    last_activity: '2024-01-20T17:15:00Z'
  }
];

export const mockMessages: Message[] = [
  {
    id: 1,
    chat_id: 1,
    author_type: 'user',
    author_id: 1,
    text: 'Здравствуйте! У меня проблема с выводом средств',
    timestamp: '2024-01-20T14:30:00Z',
    is_read: false,
    metadata: {
      source: 'telegram',
      channel: 'telegram_bot'
    }
  },
  {
    id: 2,
    chat_id: 2,
    author_type: 'bot',
    author_id: undefined,
    text: 'Добрый день! Чем могу помочь?',
    timestamp: '2024-01-20T16:45:00Z',
    is_read: true,
    metadata: {
      source: 'telegram',
      channel: 'telegram_bot'
    }
  },
  {
    id: 3,
    chat_id: 3,
    author_type: 'user',
    author_id: 3,
    text: 'Почему мой аккаунт заблокирован?',
    timestamp: '2024-01-18T11:20:00Z',
    is_read: false,
    metadata: {
      source: 'telegram',
      channel: 'telegram_bot'
    }
  },
  {
    id: 4,
    chat_id: 4,
    author_type: 'user',
    author_id: 4,
    text: 'Хочу обменять USDT на рубли',
    timestamp: '2024-01-20T17:15:00Z',
    is_read: false,
    metadata: {
      source: 'telegram',
      channel: 'telegram_bot'
    }
  }
];

export const mockChats: Chat[] = [
  {
    id: 1,
    user: mockUsers[0],
    last_message: mockMessages[0],
    status: 'waiting',
    priority: 'high',
    source: 'telegram',
    operator_id: undefined,
    is_pinned: false,
    is_important: true,
    unread_count: 2,
    created_at: '2024-01-20T14:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    escalation_reason: 'Проблема с выводом средств - требует вмешательства оператора',
    tags: ['payment', 'urgent']
  },
  {
    id: 2,
    user: mockUsers[1],
    last_message: mockMessages[1],
    status: 'in_progress',
    priority: 'medium',
    source: 'telegram',
    operator_id: 1,
    is_pinned: false,
    is_important: false,
    unread_count: 0,
    created_at: '2024-01-20T16:30:00Z',
    updated_at: '2024-01-20T16:45:00Z',
    tags: ['general']
  },
  {
    id: 3,
    user: mockUsers[2],
    last_message: mockMessages[2],
    status: 'waiting',
    priority: 'urgent',
    source: 'telegram',
    operator_id: undefined,
    is_pinned: true,
    is_important: true,
    unread_count: 1,
    created_at: '2024-01-18T11:00:00Z',
    updated_at: '2024-01-18T11:20:00Z',
    escalation_reason: 'Аккаунт заблокирован - требуется разблокировка',
    tags: ['blocked', 'urgent']
  },
  {
    id: 4,
    user: mockUsers[3],
    last_message: mockMessages[3],
    status: 'waiting',
    priority: 'low',
    source: 'telegram',
    operator_id: undefined,
    is_pinned: false,
    is_important: false,
    unread_count: 1,
    created_at: '2024-01-20T17:00:00Z',
    updated_at: '2024-01-20T17:15:00Z',
    tags: ['exchange']
  }
];

// Функция для получения чатов с задержкой (имитация API)
export const getMockChats = (): Promise<Chat[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockChats);
    }, 500);
  });
};

// Функция для получения сообщений чата
export const getMockChatMessages = (chatId: number): Promise<Message[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const chatMessages = mockMessages.filter(msg => msg.chat_id === chatId);
      resolve(chatMessages);
    }, 300);
  });
};
