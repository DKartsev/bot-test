import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

export default function conversationsRoutes(app: FastifyInstance) {
  // Получение списка диалогов
  app.get('/admin/conversations', async (request, reply) => {
    try {
      // TODO: Реализовать получение диалогов из базы данных
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Проблема с оплатой',
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'payment',
          priority: 'high',
          assignedTo: 'operator-1',
        },
        {
          id: 'conv-2',
          title: 'Вопрос по доставке',
          status: 'in_progress',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'delivery',
          priority: 'medium',
          assignedTo: 'operator-2',
        },
      ];

      return reply.send({
        success: true,
        data: mockConversations,
        total: mockConversations.length,
      });
    } catch (error) {
      app.log.error({ error: (error as Error).message }, 'Failed to get conversations');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Получение сообщений диалога
  app.get('/admin/conversations/:id/messages', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // TODO: Реализовать получение сообщений из базы данных
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Здравствуйте! У меня проблема с оплатой заказа',
          role: 'user' as const,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'msg-2',
          content: 'Здравствуйте! Давайте разберем вашу проблему. Какой именно заказ?',
          role: 'assistant' as const,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'msg-3',
          content: 'Заказ №12345 на сумму 1500 рублей',
          role: 'user' as const,
          timestamp: new Date().toISOString(),
        },
      ];

      return reply.send({
        success: true,
        data: mockMessages,
        conversationId: id,
      });
    } catch (error) {
      app.log.error({ error: (error as Error).message }, 'Failed to get messages');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Создание нового диалога
  app.post('/admin/conversations', async (request, reply) => {
    try {
      const { title, category, priority } = request.body as {
        title: string;
        category?: string;
        priority?: string;
      };

      if (!title) {
        return reply.code(400).send({
          success: false,
          error: 'Title is required',
        });
      }

      // TODO: Реализовать создание диалога в базе данных
      const newConversation = {
        id: `conv-${Date.now()}`,
        title,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: category || 'general',
        priority: priority || 'medium',
        assignedTo: null,
      };

      return reply.code(201).send({
        success: true,
        data: newConversation,
      });
    } catch (error) {
      app.log.error({ error: (error as Error).message }, 'Failed to create conversation');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Отправка сообщения в диалог
  app.post('/admin/conversations/:id/messages', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { content, role = 'assistant' } = request.body as {
        content: string;
        role?: 'user' | 'assistant' | 'system';
      };

      if (!content) {
        return reply.code(400).send({
          success: false,
          error: 'Content is required',
        });
      }

      // TODO: Реализовать сохранение сообщения в базе данных
      const newMessage = {
        id: `msg-${Date.now()}`,
        content,
        role,
        timestamp: new Date().toISOString(),
        conversationId: id,
      };

      return reply.code(201).send({
        success: true,
        data: newMessage,
      });
    } catch (error) {
      app.log.error({ error: (error as Error).message }, 'Failed to send message');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Обновление статуса диалога
  app.put('/admin/conversations/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };

      if (!status) {
        return reply.code(400).send({
          success: false,
          error: 'Status is required',
        });
      }

      // TODO: Реализовать обновление статуса в базе данных
      const updatedConversation = {
        id,
        status,
        updatedAt: new Date().toISOString(),
      };

      return reply.send({
        success: true,
        data: updatedConversation,
      });
    } catch (error) {
      app.log.error({ error: (error as Error).message }, 'Failed to update conversation status');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Сброс непрочитанных сообщений (пометить прочитанным со стороны оператора)
  app.patch('/admin/conversations/:id/read', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // TODO: Обновить unread в базе. Пока возвращаем успешный ответ.
      return reply.send({
        success: true,
        data: {
          id,
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      app.log.error({ error: (error as Error).message }, 'Failed to mark conversation as read');
      return reply.code(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Загрузка вложений в диалог (multipart)
  app.post('/admin/conversations/:id/attachments', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const parts: unknown = (request as unknown as { parts: () => AsyncIterable<{ type: string; filename?: string; mimetype?: string; file: NodeJS.ReadableStream }> }).parts();
      const saved: Array<{ filename: string; mimetype: string; size: number; path: string }> = [];

      for await (const part of parts as AsyncIterable<{ type: string; filename?: string; mimetype?: string; file: NodeJS.ReadableStream }>) {
        if (part.type === 'file') {
          const filename = part.filename as string;
          const mimetype = part.mimetype as string;
          const dest = path.join('/tmp', `${Date.now()}_${filename}`);
          await new Promise<void>((resolve, reject) => {
            const ws = fs.createWriteStream(dest);
            part.file.pipe(ws);
            ws.on('finish', () => resolve());
            ws.on('error', reject);
          });
          const bytesRead = (part.file as { bytesRead?: number }).bytesRead ?? 0;
          saved.push({ filename, mimetype, size: Number(bytesRead), path: dest });
        }
      }

      return reply.code(201).send({ success: true, data: { conversationId: id, files: saved } });
    } catch (error) {
      const err = error as Error & { file?: unknown; type?: unknown; filename?: unknown; mimetype?: unknown };
      app.log.error({ error: err.message, type: err.type, filename: err.filename, mimetype: err.mimetype }, 'Failed to upload attachments');
      return reply.code(500).send({ success: false, error: 'Internal server error' });
    }
  });
}
