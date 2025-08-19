import type { FastifyInstance } from 'fastify';

export default function metricsRoutes(app: FastifyInstance) {
  // Получение общих метрик
  app.get('/admin/metrics', async (request, reply) => {
    try {
      // TODO: Реализовать получение реальных метрик из базы данных
      const mockMetrics = {
        conversations: {
          total: 156,
          open: 23,
          inProgress: 45,
          closed: 88,
          escalated: 12,
        },
        performance: {
          avgResponseTime: '2.3 мин',
          avgResolutionTime: '45 мин',
          satisfactionScore: 4.7,
        },
        operators: {
          active: 8,
          total: 12,
          avgLoad: '15 диалогов',
        },
        categories: {
          payment: 34,
          delivery: 28,
          technical: 45,
          general: 49,
        },
      };

      return reply.send({
        success: true,
        data: mockMetrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to get metrics');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Получение метрик по периодам
  app.get('/admin/metrics/period', async (request, reply) => {
    try {
      const { period = '7d' } = request.query as { period?: string };

      // TODO: Реализовать получение метрик по периодам
      const mockPeriodMetrics = {
        period,
        data: [
          { date: '2025-08-11', conversations: 12, resolved: 10, avgTime: '38 мин' },
          { date: '2025-08-12', conversations: 15, resolved: 13, avgTime: '42 мин' },
          { date: '2025-08-13', conversations: 18, resolved: 16, avgTime: '35 мин' },
          { date: '2025-08-14', conversations: 14, resolved: 12, avgTime: '41 мин' },
          { date: '2025-08-15', conversations: 20, resolved: 18, avgTime: '33 мин' },
          { date: '2025-08-16', conversations: 16, resolved: 14, avgTime: '39 мин' },
          { date: '2025-08-17', conversations: 13, resolved: 11, avgTime: '36 мин' },
        ],
      };

      return reply.send({
        success: true,
        data: mockPeriodMetrics,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to get period metrics');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Получение метрик операторов
  app.get('/admin/metrics/operators', async (request, reply) => {
    try {
      // TODO: Реализовать получение метрик операторов
      const mockOperatorMetrics = [
        {
          id: 'op-1',
          name: 'Анна Петрова',
          conversations: 45,
          resolved: 42,
          avgResponseTime: '1.8 мин',
          satisfactionScore: 4.8,
        },
        {
          id: 'op-2',
          name: 'Иван Сидоров',
          conversations: 38,
          resolved: 35,
          avgResponseTime: '2.1 мин',
          satisfactionScore: 4.6,
        },
        {
          id: 'op-3',
          name: 'Мария Козлова',
          conversations: 52,
          resolved: 48,
          avgResponseTime: '1.9 мин',
          satisfactionScore: 4.9,
        },
      ];

      return reply.send({
        success: true,
        data: mockOperatorMetrics,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to get operator metrics');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
