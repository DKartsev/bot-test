import { FastifyInstance } from "fastify";

export default async function categoriesRoutes(app: FastifyInstance) {
  // Получение списка категорий
  app.get("/admin/categories", async (request, reply) => {
    try {
      // TODO: Реализовать получение категорий из базы данных
      const mockCategories = [
        {
          id: "cat-1",
          name: "Оплата",
          slug: "payment",
          description: "Вопросы по оплате заказов и возврату средств",
          color: "#3B82F6",
          icon: "credit-card",
          priority: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "cat-2",
          name: "Доставка",
          slug: "delivery",
          description: "Вопросы по доставке, отслеживанию и срокам",
          color: "#10B981",
          icon: "truck",
          priority: 2,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "cat-3",
          name: "Техническая поддержка",
          slug: "technical",
          description: "Технические вопросы и проблемы с сервисом",
          color: "#F59E0B",
          icon: "wrench",
          priority: 3,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "cat-4",
          name: "Общие вопросы",
          slug: "general",
          description: "Общие вопросы по работе сервиса",
          color: "#6B7280",
          icon: "help-circle",
          priority: 4,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      return reply.send({
        success: true,
        data: mockCategories,
        total: mockCategories.length
      });
    } catch (error) {
      app.log.error({ error }, "Failed to get categories");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Получение категории по ID
  app.get("/admin/categories/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // TODO: Реализовать получение категории из базы данных
      const mockCategory = {
        id,
        name: "Оплата",
        slug: "payment",
        description: "Вопросы по оплате заказов и возврату средств",
        color: "#3B82F6",
        icon: "credit-card",
        priority: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          keywords: ["оплата", "карта", "банк", "возврат"],
          parentCategory: null,
          subCategories: []
        }
      };

      return reply.send({
        success: true,
        data: mockCategory
      });
    } catch (error) {
      app.log.error({ error }, "Failed to get category");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Создание новой категории
  app.post("/admin/categories", async (request, reply) => {
    try {
      const { name, slug, description, color, icon, priority } = request.body as {
        name: string;
        slug: string;
        description?: string;
        color?: string;
        icon?: string;
        priority?: number;
      };

      if (!name || !slug) {
        return reply.code(400).send({
          success: false,
          error: "Name and slug are required"
        });
      }

      // TODO: Реализовать создание категории в базе данных
      const newCategory = {
        id: `cat-${Date.now()}`,
        name,
        slug,
        description: description || "",
        color: color || "#6B7280",
        icon: icon || "tag",
        priority: priority || 999,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return reply.code(201).send({
        success: true,
        data: newCategory
      });
    } catch (error) {
      app.log.error({ error }, "Failed to create category");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Обновление категории
  app.put("/admin/categories/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, slug, description, color, icon, priority, isActive } = request.body as {
        name?: string;
        slug?: string;
        description?: string;
        color?: string;
        icon?: string;
        priority?: number;
        isActive?: boolean;
      };

      // TODO: Реализовать обновление категории в базе данных
      const updatedCategory = {
        id,
        name: name || "Обновленная категория",
        slug: slug || "updated-category",
        description: description || "",
        color: color || "#6B7280",
        icon: icon || "tag",
        priority: priority || 999,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: updatedCategory
      });
    } catch (error) {
      app.log.error({ error }, "Failed to update category");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Изменение статуса категории
  app.patch("/admin/categories/:id/status", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { isActive } = request.body as { isActive: boolean };

      if (isActive === undefined) {
        return reply.code(400).send({
          success: false,
          error: "isActive is required"
        });
      }

      // TODO: Реализовать изменение статуса в базе данных
      const updatedCategory = {
        id,
        isActive,
        updatedAt: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: updatedCategory
      });
    } catch (error) {
      app.log.error({ error }, "Failed to update category status");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Получение статистики по категориям
  app.get("/admin/categories/stats", async (request, reply) => {
    try {
      // TODO: Реализовать получение статистики из базы данных
      const mockStats = {
        total: 8,
        active: 7,
        inactive: 1,
        byPriority: {
          high: 2,
          medium: 4,
          low: 2
        },
        usage: {
          "payment": 156,
          "delivery": 89,
          "technical": 234,
          "general": 67
        }
      };

      return reply.send({
        success: true,
        data: mockStats
      });
    } catch (error) {
      app.log.error({ error }, "Failed to get category stats");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });
}
