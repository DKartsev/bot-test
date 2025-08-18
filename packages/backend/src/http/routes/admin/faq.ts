import { FastifyInstance } from "fastify";

export default async function faqRoutes(app: FastifyInstance) {
  // Получение списка FAQ
  app.get("/admin/faq", async (request, reply) => {
    try {
      // TODO: Реализовать получение FAQ из базы данных
      const mockFAQ = [
        {
          id: "faq-1",
          question: "Как отменить заказ?",
          answer: "Для отмены заказа обратитесь в службу поддержки или используйте личный кабинет.",
          category: "orders",
          tags: ["отмена", "заказ"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "faq-2",
          question: "Сколько времени занимает доставка?",
          answer: "Стандартная доставка занимает 1-3 дня, экспресс доставка - в течение дня.",
          category: "delivery",
          tags: ["доставка", "время"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "faq-3",
          question: "Какие способы оплаты доступны?",
          answer: "Доступны оплата картой, электронными кошельками и наличными при получении.",
          category: "payment",
          tags: ["оплата", "карта", "наличные"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "faq-4",
          question: "Как вернуть товар?",
          answer: "Возврат возможен в течение 14 дней с момента покупки при сохранении товарного вида.",
          category: "returns",
          tags: ["возврат", "товар"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      return reply.send({
        success: true,
        data: mockFAQ,
        total: mockFAQ.length
      });
    } catch (error) {
      app.log.error({ error }, "Failed to get FAQ");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Получение FAQ по категории
  app.get("/admin/faq/category/:category", async (request, reply) => {
    try {
      const { category } = request.params as { category: string };
      
      // TODO: Реализовать фильтрацию FAQ по категории
      const mockFAQByCategory = [
        {
          id: "faq-1",
          question: "Как отменить заказ?",
          answer: "Для отмены заказа обратитесь в службу поддержки или используйте личный кабинет.",
          category: "orders",
          tags: ["отмена", "заказ"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ].filter(faq => faq.category === category);

      return reply.send({
        success: true,
        data: mockFAQByCategory,
        category,
        total: mockFAQByCategory.length
      });
    } catch (error) {
      app.log.error({ error }, "Failed to get FAQ by category");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Поиск по FAQ
  app.get("/admin/faq/search", async (request, reply) => {
    try {
      const { q = "" } = request.query as { q?: string };
      
      if (!q) {
        return reply.code(400).send({
          success: false,
          error: "Search query is required"
        });
      }

      // TODO: Реализовать поиск по FAQ
      const mockSearchResults = [
        {
          id: "faq-1",
          question: "Как отменить заказ?",
          answer: "Для отмены заказа обратитесь в службу поддержки или используйте личный кабинет.",
          category: "orders",
          tags: ["отмена", "заказ"],
          relevance: 0.95
        }
      ].filter(faq => 
        faq.question.toLowerCase().includes(q.toLowerCase()) ||
        faq.answer.toLowerCase().includes(q.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
      );

      return reply.send({
        success: true,
        data: mockSearchResults,
        query: q,
        total: mockSearchResults.length
      });
    } catch (error) {
      app.log.error({ error }, "Failed to search FAQ");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Создание нового FAQ
  app.post("/admin/faq", async (request, reply) => {
    try {
      const { question, answer, category, tags } = request.body as {
        question: string;
        answer: string;
        category: string;
        tags?: string[];
      };

      if (!question || !answer || !category) {
        return reply.code(400).send({
          success: false,
          error: "Question, answer and category are required"
        });
      }

      // TODO: Реализовать сохранение FAQ в базе данных
      const newFAQ = {
        id: `faq-${Date.now()}`,
        question,
        answer,
        category,
        tags: tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return reply.code(201).send({
        success: true,
        data: newFAQ
      });
    } catch (error) {
      app.log.error({ error }, "Failed to create FAQ");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Обновление FAQ
  app.put("/admin/faq/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { question, answer, category, tags } = request.body as {
        question?: string;
        answer?: string;
        category?: string;
        tags?: string[];
      };

      // TODO: Реализовать обновление FAQ в базе данных
      const updatedFAQ = {
        id,
        question: question || "Обновленный вопрос",
        answer: answer || "Обновленный ответ",
        category: category || "general",
        tags: tags || [],
        updatedAt: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: updatedFAQ
      });
    } catch (error) {
      app.log.error({ error }, "Failed to update FAQ");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });
}
