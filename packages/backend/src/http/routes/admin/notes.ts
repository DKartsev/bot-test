import { FastifyInstance } from "fastify";

export default async function notesRoutes(app: FastifyInstance) {
  // Получение заметок для диалога
  app.get("/admin/conversations/:conversationId/notes", async (request, reply) => {
    try {
      const { conversationId } = request.params as { conversationId: string };
      
      // TODO: Реализовать получение заметок из базы данных
      const mockNotes = [
        {
          id: "note-1",
          conversationId,
          content: "Клиент сообщил о проблеме с оплатой картой Visa",
          author: "anna.petrova",
          authorName: "Анна Петрова",
          type: "internal",
          isPrivate: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: "note-2",
          conversationId,
          content: "Проблема решена - перезапустил процесс оплаты",
          author: "anna.petrova",
          authorName: "Анна Петрова",
          type: "resolution",
          isPrivate: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      return reply.send({
        success: true,
        data: mockNotes,
        conversationId,
        total: mockNotes.length
      });
    } catch (error) {
      app.log.error({ error }, "Failed to get notes");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Создание новой заметки
  app.post("/admin/conversations/:conversationId/notes", async (request, reply) => {
    try {
      const { conversationId } = request.params as { conversationId: string };
      const { content, type = "internal", isPrivate = false } = request.body as {
        content: string;
        type?: "internal" | "resolution" | "warning" | "info";
        isPrivate?: boolean;
      };

      if (!content) {
        return reply.code(400).send({
          success: false,
          error: "Content is required"
        });
      }

      // TODO: Реализовать сохранение заметки в базе данных
      const newNote = {
        id: `note-${Date.now()}`,
        conversationId,
        content,
        author: "current.user", // TODO: Получать из аутентификации
        authorName: "Текущий пользователь", // TODO: Получать из аутентификации
        type,
        isPrivate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return reply.code(201).send({
        success: true,
        data: newNote
      });
    } catch (error) {
      app.log.error({ error }, "Failed to create note");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Обновление заметки
  app.put("/admin/notes/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { content, type, isPrivate } = request.body as {
        content?: string;
        type?: "internal" | "resolution" | "warning" | "info";
        isPrivate?: boolean;
      };

      // TODO: Реализовать обновление заметки в базе данных
      const updatedNote = {
        id,
        content: content || "Обновленная заметка",
        type: type || "internal",
        isPrivate: isPrivate !== undefined ? isPrivate : false,
        updatedAt: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: updatedNote
      });
    } catch (error) {
      app.log.error({ error }, "Failed to update note");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Удаление заметки
  app.delete("/admin/notes/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // TODO: Реализовать удаление заметки из базы данных
      app.log.info({ noteId: id }, "Note deleted");

      return reply.send({
        success: true,
        message: "Note deleted successfully"
      });
    } catch (error) {
      app.log.error({ error }, "Failed to delete note");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Получение заметок по автору
  app.get("/admin/notes/author/:author", async (request, reply) => {
    try {
      const { author } = request.params as { author: string };
      
      // TODO: Реализовать получение заметок по автору из базы данных
      const mockAuthorNotes = [
        {
          id: "note-1",
          conversationId: "conv-1",
          content: "Клиент сообщил о проблеме с оплатой картой Visa",
          author,
          authorName: "Анна Петрова",
          type: "internal",
          isPrivate: false,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];

      return reply.send({
        success: true,
        data: mockAuthorNotes,
        author,
        total: mockAuthorNotes.length
      });
    } catch (error) {
      app.log.error({ error }, "Failed to get notes by author");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });

  // Поиск по заметкам
  app.get("/admin/notes/search", async (request, reply) => {
    try {
      const { q = "", type, isPrivate } = request.query as {
        q?: string;
        type?: string;
        isPrivate?: string;
      };
      
      if (!q) {
        return reply.code(400).send({
          success: false,
          error: "Search query is required"
        });
      }

      // TODO: Реализовать поиск по заметкам
      const mockSearchResults = [
        {
          id: "note-1",
          conversationId: "conv-1",
          content: "Клиент сообщил о проблеме с оплатой картой Visa",
          author: "anna.petrova",
          authorName: "Анна Петрова",
          type: "internal",
          isPrivate: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          relevance: 0.95
        }
      ].filter(note => 
        note.content.toLowerCase().includes(q.toLowerCase()) &&
        (!type || note.type === type) &&
        (!isPrivate || note.isPrivate.toString() === isPrivate)
      );

      return reply.send({
        success: true,
        data: mockSearchResults,
        query: q,
        total: mockSearchResults.length
      });
    } catch (error) {
      app.log.error({ error }, "Failed to search notes");
      return reply.code(500).send({
        success: false,
        error: "Internal server error"
      });
    }
  });
}
