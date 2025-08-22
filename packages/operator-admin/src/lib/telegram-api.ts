// API клиент для работы с Telegram
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface TelegramChat {
  id: string;
  title: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  username?: string;
  first_name?: string;
  last_name?: string;
  last_message?: string;
  last_message_date?: string;
  unread_count?: number;
  status: 'active' | 'inactive' | 'blocked';
}

export interface TelegramMessage {
  id: string;
  chat_id: string;
  from_user_id?: string;
  from_user_name?: string;
  text: string;
  date: string;
  is_outgoing: boolean;
  message_type: 'text' | 'photo' | 'document' | 'voice' | 'video';
}

export interface SendMessageRequest {
  chat_id: string;
  text: string;
}

export class TelegramAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Получение списка чатов
  async getChats(): Promise<TelegramChat[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/telegram/chats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  // Получение сообщений чата
  async getChatMessages(chatId: string, limit: number = 50): Promise<TelegramMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/telegram/chats/${chatId}/messages?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // Отправка сообщения в Telegram
  async sendMessage(request: SendMessageRequest): Promise<TelegramMessage> {
    try {
      const response = await fetch(`${this.baseUrl}/api/telegram/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Получение информации о чате
  async getChatInfo(chatId: string): Promise<TelegramChat> {
    try {
      const response = await fetch(`${this.baseUrl}/api/telegram/chats/${chatId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching chat info:', error);
      throw error;
    }
  }
}

export const telegramAPI = new TelegramAPI();
