import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import conversationsRoutes from './conversations.js';

// Мокаем Fastify
const mockApp = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
} as unknown as FastifyInstance;

describe('Admin Conversations Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('route registration', () => {
    it('should register all required routes', () => {
      conversationsRoutes(mockApp);

      // Проверяем что все основные маршруты зарегистрированы
      expect(mockApp.get).toHaveBeenCalledWith('/admin/conversations', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/admin/conversations/:id/messages', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/admin/conversations', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/admin/conversations/:id/messages', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/admin/conversations/:id/attachments', expect.any(Function));
      expect(mockApp.put).toHaveBeenCalledWith('/admin/conversations/:id/status', expect.any(Function));
      expect(mockApp.patch).toHaveBeenCalledWith('/admin/conversations/:id/read', expect.any(Function));
    });
  });

  describe('GET /admin/conversations', () => {
    it('should return conversations list', async () => {
      conversationsRoutes(mockApp);
      
      expect(mockApp.get).toHaveBeenCalledWith('/admin/conversations', expect.any(Function));
    });
  });

  describe('GET /admin/conversations/:id/messages', () => {
    it('should return conversation messages', async () => {
      conversationsRoutes(mockApp);
      
      expect(mockApp.get).toHaveBeenCalledWith('/admin/conversations/:id/messages', expect.any(Function));
    });
  });

  describe('POST /admin/conversations', () => {
    it('should create new conversation', async () => {
      conversationsRoutes(mockApp);
      
      expect(mockApp.post).toHaveBeenCalledWith('/admin/conversations', expect.any(Function));
    });
  });

  describe('PUT /admin/conversations/:id/status', () => {
    it('should update conversation status', async () => {
      conversationsRoutes(mockApp);
      
      expect(mockApp.put).toHaveBeenCalledWith('/admin/conversations/:id/status', expect.any(Function));
    });
  });

  describe('POST /admin/conversations/:id/messages', () => {
    it('should create new message', async () => {
      conversationsRoutes(mockApp);
      
      expect(mockApp.post).toHaveBeenCalledWith('/admin/conversations/:id/messages', expect.any(Function));
    });
  });

  describe('POST /admin/conversations/:id/attachments', () => {
    it('should handle file uploads', async () => {
      conversationsRoutes(mockApp);
      
      expect(mockApp.post).toHaveBeenCalledWith('/admin/conversations/:id/attachments', expect.any(Function));
    });
  });

  describe('PATCH /admin/conversations/:id/read', () => {
    it('should mark conversation as read', async () => {
      conversationsRoutes(mockApp);
      
      expect(mockApp.patch).toHaveBeenCalledWith('/admin/conversations/:id/read', expect.any(Function));
    });
  });
});
