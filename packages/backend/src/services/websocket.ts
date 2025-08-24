import type { Server as HttpServer } from 'http';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { logError, logInfo, logWarning } from '../utils/logger';

// Типы для WebSocket сообщений
export interface WebSocketMessage {
  type: 'ping' | 'pong' | 'subscribe' | 'unsubscribe' | 'chat_update' | 'message_update';
  data?: any;
  timestamp?: string;
}

export interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: number;
  isAlive: boolean;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
    this.startPingInterval();
    this.startCleanupInterval();

    logInfo('WebSocket сервис инициализирован');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      const connectionId = this.generateConnectionId();
      const clientIp = request.socket.remoteAddress || 'unknown';

      // Создаем новое соединение
      const connection: WebSocketConnection = {
        id: connectionId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now(),
        isAlive: true,
      };

      this.connections.set(connectionId, connection);

      logInfo('Новое WebSocket соединение', {
        connectionId,
        clientIp,
        totalConnections: this.connections.size,
      });

      // Обработчики событий соединения
      ws.on('message', (data: Buffer) => {
        this.handleMessage(connectionId, data);
      });

      ws.on('pong', () => {
        const conn = this.connections.get(connectionId);
        if (conn) {
          conn.isAlive = true;
          conn.lastPing = Date.now();
        }
      });

      ws.on('close', () => {
        this.handleConnectionClose(connectionId);
      });

      ws.on('error', (error) => {
        logError('Ошибка WebSocket соединения', {
          connectionId,
          error: error.message,
        });
        this.handleConnectionClose(connectionId);
      });

      // Отправляем приветственное сообщение
      ws.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString(),
      }));
    });

    this.wss.on('error', (error) => {
      logError('Ошибка WebSocket сервера', {
        error: error.message,
      });
    });
  }

  private handleMessage(connectionId: string, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const connection = this.connections.get(connectionId);

      if (!connection) {
        logWarning('Сообщение от несуществующего соединения', { connectionId });
        return;
      }

      logInfo('Получено WebSocket сообщение', {
        connectionId,
        messageType: message.type,
        timestamp: message.timestamp,
      });

      switch (message.type) {
        case 'ping':
          this.handlePing(connectionId);
          break;
        case 'subscribe':
          this.handleSubscribe(connectionId, message.data as Record<string, unknown>);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(connectionId, message.data as Record<string, unknown>);
          break;
        default:
          logWarning('Неизвестный тип WebSocket сообщения', {
            connectionId,
            messageType: message.type,
          });
      }
    } catch (error) {
      logError('Ошибка обработки WebSocket сообщения', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private handlePing(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = true;
      connection.lastPing = Date.now();

      // Отправляем pong
      connection.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private handleSubscribe(connectionId: string, data: Record<string, unknown>): void {
    const connection = this.connections.get(connectionId);
    if (connection && data?.['channel']) {
      connection.subscriptions.add(String(data['channel']));

      logInfo('Подписка на канал', {
        connectionId,
        channel: data['channel'],
        totalSubscriptions: connection.subscriptions.size,
      });

      // Подтверждаем подписку
      connection.ws.send(JSON.stringify({
        type: 'subscribed',
        channel: data['channel'],
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private handleUnsubscribe(connectionId: string, data: Record<string, unknown>): void {
    const connection = this.connections.get(connectionId);
    if (connection && data?.['channel']) {
      connection.subscriptions.delete(String(data['channel']));

      logInfo('Отписка от канала', {
        connectionId,
        channel: data['channel'],
        totalSubscriptions: connection.subscriptions.size,
      });

      // Подтверждаем отписку
      connection.ws.send(JSON.stringify({
        type: 'unsubscribed',
        channel: data['channel'],
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private handleConnectionClose(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);

      logInfo('WebSocket соединение закрыто', {
        connectionId,
        totalConnections: this.connections.size,
      });
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((connection, connectionId) => {
        if (!connection.isAlive) {
          logWarning('WebSocket соединение не отвечает, закрываем', { connectionId });
          connection.ws.terminate();
          this.connections.delete(connectionId);
          return;
        }

        connection.isAlive = false;
        connection.ws.ping();
      });
    }, 30000); // каждые 30 секунд
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxIdleTime = 5 * 60 * 1000; // 5 минут

      this.connections.forEach((connection, connectionId) => {
        if (now - connection.lastPing > maxIdleTime) {
          logWarning('WebSocket соединение неактивно, закрываем', { connectionId });
          connection.ws.terminate();
          this.connections.delete(connectionId);
        }
      });
    }, 60000); // каждую минуту
  }

  // Публичные методы

  // Отправка сообщения всем подписчикам канала
  public broadcastToChannel(channel: string, message: Record<string, unknown>): void {
    let sentCount = 0;

    this.connections.forEach((connection) => {
      if (connection.subscriptions.has(channel)) {
        try {
          connection.ws.send(JSON.stringify({
            type: 'broadcast',
            channel,
            data: message,
            timestamp: new Date().toISOString(),
          }));
          sentCount++;
        } catch (error) {
          logError('Ошибка отправки сообщения в канал', {
            connectionId: connection.id,
            channel,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    logInfo('Сообщение отправлено в канал', {
      channel,
      sentCount,
      totalSubscribers: this.getChannelSubscriberCount(channel),
    });
  }

  // Отправка сообщения конкретному соединению
  public sendToConnection(connectionId: string, message: Record<string, unknown>): boolean {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.ws.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
        }));
        return true;
      } catch (error) {
        logError('Ошибка отправки сообщения соединению', {
          connectionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return false;
      }
    }
    return false;
  }

  // Получение статистики канала
  public getChannelSubscriberCount(channel: string): number {
    let count = 0;
    this.connections.forEach((connection) => {
      if (connection.subscriptions.has(channel)) {
        count++;
      }
    });
    return count;
  }

  // Получение статистики соединений
  public getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(c => c.isAlive).length,
      totalSubscriptions: Array.from(this.connections.values()).reduce((sum, c) => sum + c.subscriptions.size, 0),
    };
  }

  // Очистка ресурсов
  public cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Закрываем все соединения
    this.connections.forEach((connection) => {
      try {
        connection.ws.close();
      } catch (error) {
        // Игнорируем ошибки при закрытии
      }
    });

    this.connections.clear();

    if (this.wss) {
      this.wss.close();
    }

    logInfo('WebSocket сервис очищен');
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
