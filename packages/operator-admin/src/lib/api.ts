import { Chat, Message, User, Operator, CannedResponse, Note, Case } from '../types';
import { API_CONFIG } from '../config/api';

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Пробуем разные URL для подключения
    const urls = [API_CONFIG.BASE_URL, ...API_CONFIG.FALLBACK_URLS];
    
    for (const baseUrl of urls) {
      try {
        const url = `${baseUrl}${endpoint}`;
        console.log(`🔄 Попытка подключения к: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(globalThis as any).localStorage?.getItem('auth_token')
              ? { 'Authorization': `Bearer ${(globalThis as any).localStorage.getItem('auth_token')}` }
              : {},
            ...options.headers,
          },
          ...options,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${(errorData as any).message || ''}`);
        }

        console.log(`✅ Успешное подключение к: ${baseUrl}`);
        return response.json() as any;
      } catch (error) {
        console.warn(`❌ Ошибка подключения к ${baseUrl}:`, error);
        if (baseUrl === urls[urls.length - 1]) {
          // Последняя попытка - выбрасываем ошибку
          if (error instanceof Error) {
            throw new Error(`Network Error: ${error.message}`);
          }
          throw new Error('Unknown network error');
        }
        // Продолжаем с следующим URL
        continue;
      }
    }
    
    throw new Error('Все попытки подключения не удались');
  }
  // Аутентификация
  async login(email: string, password: string): Promise<{ access: string; refresh: string }> {
    const result = await this.request<{ success: boolean; data: { tokens: { access: string; refresh: string } } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    const tokens = result.data.tokens;
    (globalThis as any).localStorage?.setItem('auth_token', tokens.access);
    (globalThis as any).localStorage?.setItem('refresh_token', tokens.refresh);
    return { access: tokens.access, refresh: tokens.refresh };
  }

  logout(): void {
    (globalThis as any).localStorage?.removeItem('auth_token');
    (globalThis as any).localStorage?.removeItem('refresh_token');
  }


  // Чат-бот API
  async getChats(filters?: any): Promise<Chat[]> {
    let endpoint = '/api/chats';
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
    }
    return this.request<Chat[]>(endpoint);
  }

  async getChat(chatId: number): Promise<Chat> {
    return this.request<Chat>(`/api/chats/${chatId}`);
  }

  async getChatMessages(chatId: number, limit = 50, offset = 0): Promise<Message[]> {
    return this.request<Message[]>(`/api/chats/${chatId}/messages?limit=${limit}&offset=${offset}`);
  }

  async sendMessage(chatId: number, text: string, attachments?: File[]): Promise<Message> {
    const formData = new FormData();
    formData.append('text', text);
    if (attachments) {
      attachments.forEach(file => formData.append('attachments', file));
    }

    return this.request<Message>(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: formData,
    });
  }

  async takeChat(chatId: number): Promise<Chat> {
    return this.request<Chat>(`/api/chats/${chatId}/take`, { method: 'POST' });
  }

  async closeChat(chatId: number): Promise<Chat> {
    return this.request<Chat>(`/api/chats/${chatId}/close`, { method: 'POST' });
  }

  // Telegram API интеграция
  async getTelegramUser(telegramId: number): Promise<User> {
    return this.request<User>(`/api/telegram/users/${telegramId}`);
  }

  async getTelegramChat(telegramChatId: number): Promise<Chat> {
    return this.request<Chat>(`/api/telegram/chats/${telegramChatId}`);
  }

  async sendTelegramMessage(chatId: number, text: string): Promise<Message> {
    return this.request<Message>('/api/telegram/send', {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  }

  // Операторы
  async getOperators(): Promise<Operator[]> {
    return this.request<Operator[]>('/api/operators');
  }

  async getCurrentOperator(): Promise<Operator> {
    return this.request<Operator>('/api/operators/me');
  }

  // Шаблоны и заметки
  async getCannedResponses(): Promise<CannedResponse[]> {
    return this.request<CannedResponse[]>('/api/canned-responses');
  }

  async createNote(chatId: number, content: string, isInternal = true): Promise<Note> {
    return this.request<Note>('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, content, is_internal: isInternal }),
    });
  }

  async getNotes(chatId: number): Promise<Note[]> {
    return this.request<Note[]>(`/api/chats/${chatId}/notes`);
  }

  // Кейсы
  async createCase(chatId: number, title: string, description: string, priority: string): Promise<Case> {
    return this.request<Case>('/api/cases', {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, title, description, priority }),
    });
  }

  // AI улучшения
  async improveResponse(text: string, isOperator = false): Promise<{ improved_text: string }> {
    return this.request<{ improved_text: string }>('/api/ai/improve', {
      method: 'POST',
      body: JSON.stringify({ text, is_operator: isOperator }),
    });
  }

  // WebSocket для real-time обновлений
  createWebSocket(): any {
    const wsUrl = API_CONFIG.WS_URL;
    return new (globalThis as any).WebSocket(wsUrl);
  }

  // Проверка соединения с backend
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.request<{ status: string; timestamp: string }>('/health');
    } catch (error) {
      throw new Error('Backend недоступен');
    }
  }

  // Получение статистики
  async getStats(): Promise<{
    total_chats: number;
    waiting_chats: number;
    active_operators: number;
    avg_response_time: number;
  }> {
    return this.request('/api/stats');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
