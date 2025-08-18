/**
 * API клиент для взаимодействия с backend сервисом
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  time: string;
}

export interface Conversation {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Базовый метод для HTTP запросов
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Проверка здоровья backend сервиса
   */
  async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>('/');
  }

  /**
   * Получение списка диалогов
   */
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request<Conversation[]>('/admin/conversations');
  }

  /**
   * Получение сообщений диалога
   */
  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/admin/conversations/${conversationId}/messages`);
  }

  /**
   * Отправка сообщения в диалог
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<ApiResponse<Message>> {
    return this.request<Message>(`/admin/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  /**
   * Создание нового диалога
   */
  async createConversation(title: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/admin/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Обновление статуса диалога
   */
  async updateConversationStatus(
    conversationId: string,
    status: string
  ): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/admin/conversations/${conversationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Получение метрик
   */
  async getMetrics(): Promise<ApiResponse<any>> {
    return this.request('/admin/metrics');
  }

  /**
   * Получение FAQ
   */
  async getFAQ(): Promise<ApiResponse<any>> {
    return this.request('/admin/faq');
  }
}

// Экспортируем singleton instance
export const apiClient = new ApiClient();

// Экспортируем класс для тестирования
export default ApiClient;
