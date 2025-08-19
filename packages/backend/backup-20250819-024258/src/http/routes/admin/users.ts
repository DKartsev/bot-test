import type { FastifyInstance } from 'fastify';

export default function usersRoutes(app: FastifyInstance) {
  // Получение списка пользователей
  app.get('/admin/users', async (request, reply) => {
    try {
      // TODO: Реализовать получение пользователей из базы данных
      const mockUsers = [
        {
          id: 'user-1',
          username: 'anna.petrova',
          email: 'anna.petrova@company.com',
          fullName: 'Анна Петрова',
          role: 'operator',
          status: 'active',
          lastLogin: new Date(Date.now() - 3600000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          permissions: ['read', 'write', 'admin'],
        },
        {
          id: 'user-2',
          username: 'ivan.sidorov',
          email: 'ivan.sidorov@company.com',
          fullName: 'Иван Сидоров',
          role: 'operator',
          status: 'active',
          lastLogin: new Date(Date.now() - 7200000).toISOString(),
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          permissions: ['read', 'write'],
        },
        {
          id: 'user-3',
          username: 'maria.kozlova',
          email: 'maria.kozlova@company.com',
          fullName: 'Мария Козлова',
          role: 'supervisor',
          status: 'active',
          lastLogin: new Date().toISOString(),
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          permissions: ['read', 'write', 'admin', 'supervisor'],
        },
      ];

      return reply.send({
        success: true,
        data: mockUsers,
        total: mockUsers.length,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to get users');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Получение пользователя по ID
  app.get('/admin/users/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // TODO: Реализовать получение пользователя из базы данных
      const mockUser = {
        id,
        username: 'anna.petrova',
        email: 'anna.petrova@company.com',
        fullName: 'Анна Петрова',
        role: 'operator',
        status: 'active',
        lastLogin: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        permissions: ['read', 'write', 'admin'],
        profile: {
          phone: '+7 (999) 123-45-67',
          department: 'Поддержка клиентов',
          position: 'Оператор 1-й линии',
        },
      };

      return reply.send({
        success: true,
        data: mockUser,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to get user');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Создание нового пользователя
  app.post('/admin/users', async (request, reply) => {
    try {
      const { username, email, fullName, role, permissions } = request.body as {
        username: string;
        email: string;
        fullName: string;
        role: string;
        permissions?: string[];
      };

      if (!username || !email || !fullName || !role) {
        return reply.code(400).send({
          success: false,
          error: 'Username, email, fullName and role are required',
        });
      }

      // TODO: Реализовать создание пользователя в базе данных
      const newUser = {
        id: `user-${Date.now()}`,
        username,
        email,
        fullName,
        role,
        status: 'active',
        lastLogin: null,
        createdAt: new Date().toISOString(),
        permissions: permissions || ['read'],
        profile: {
          phone: '',
          department: '',
          position: '',
        },
      };

      return reply.code(201).send({
        success: true,
        data: newUser,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to create user');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Обновление пользователя
  app.put('/admin/users/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { username, email, fullName, role, status, permissions } = request.body as {
        username?: string;
        email?: string;
        fullName?: string;
        role?: string;
        status?: string;
        permissions?: string[];
      };

      // TODO: Реализовать обновление пользователя в базе данных
      const updatedUser = {
        id,
        username: username || 'updated.user',
        email: email || 'updated@company.com',
        fullName: fullName || 'Обновленный пользователь',
        role: role || 'operator',
        status: status || 'active',
        permissions: permissions || ['read'],
        updatedAt: new Date().toISOString(),
      };

      return reply.send({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to update user');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Изменение статуса пользователя
  app.patch('/admin/users/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };

      if (!status) {
        return reply.code(400).send({
          success: false,
          error: 'Status is required',
        });
      }

      // TODO: Реализовать изменение статуса в базе данных
      const updatedUser = {
        id,
        status,
        updatedAt: new Date().toISOString(),
      };

      return reply.send({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to update user status');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Получение статистики пользователей
  app.get('/admin/users/stats', async (request, reply) => {
    try {
      // TODO: Реализовать получение статистики из базы данных
      const mockStats = {
        total: 15,
        active: 12,
        inactive: 2,
        suspended: 1,
        byRole: {
          operator: 8,
          supervisor: 4,
          admin: 2,
          manager: 1,
        },
        byDepartment: {
          'Поддержка клиентов': 10,
          'Техническая поддержка': 3,
          'Менеджмент': 2,
        },
      };

      return reply.send({
        success: true,
        data: mockStats,
      });
    } catch (error) {
      app.log.error({ error }, 'Failed to get user stats');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
