import { z } from 'zod';

// Базовые схемы
export const idSchema = z.object({
  id: z.number().int().positive(),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Схемы для пользователей
export const createUserSchema = z.object({
  telegram_id: z.number().int().positive(),
  username: z.string().optional(),
  first_name: z.string().min(1).max(255),
  last_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  balance: z.number().default(0),
  deals_count: z.number().int().min(0).default(0),
  flags: z.array(z.string()).default([]),
  is_blocked: z.boolean().default(false),
  is_verified: z.boolean().default(false),
});

export const updateUserSchema = z.object({
  username: z.string().optional(),
  first_name: z.string().min(1).max(255).optional(),
  last_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  balance: z.number().optional(),
  deals_count: z.number().int().min(0).optional(),
  flags: z.array(z.string()).optional(),
  is_blocked: z.boolean().optional(),
  is_verified: z.boolean().optional(),
});

// Схемы для операторов
export const createOperatorSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['operator', 'senior_operator', 'admin']).default('operator'),
  is_active: z.boolean().default(true),
});

export const updateOperatorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['operator', 'senior_operator', 'admin']).optional(),
  is_active: z.boolean().optional(),
});

export const loginOperatorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Схемы для чатов
export const createChatSchema = z.object({
  user_id: z.number().int().positive(),
  status: z.enum(['waiting', 'in_progress', 'closed']).default('waiting'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  source: z.enum(['telegram', 'website', 'p2p']).default('telegram'),
  operator_id: z.number().int().positive().optional(),
  is_pinned: z.boolean().default(false),
  is_important: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  escalation_reason: z.string().optional(),
});

export const updateChatSchema = z.object({
  status: z.enum(['waiting', 'in_progress', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  operator_id: z.number().int().positive().optional(),
  is_pinned: z.boolean().optional(),
  is_important: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  escalation_reason: z.string().optional(),
});

export const chatFiltersSchema = z.object({
  status: z.array(z.enum(['waiting', 'in_progress', 'closed'])).optional(),
  priority: z.array(z.enum(['low', 'medium', 'high', 'urgent'])).optional(),
  source: z.array(z.enum(['telegram', 'website', 'p2p'])).optional(),
  operator_id: z.number().int().positive().optional(),
  user_id: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// Схемы для сообщений
export const createMessageSchema = z.object({
  chat_id: z.number().int().positive(),
  author_type: z.enum(['user', 'bot', 'operator']),
  author_id: z.number().int().positive().optional(),
  text: z.string().min(1).max(10000),
  is_read: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateMessageSchema = z.object({
  text: z.string().min(1).max(10000).optional(),
  is_read: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const messageFiltersSchema = z.object({
  chat_id: z.number().int().positive().optional(),
  author_type: z.enum(['user', 'bot', 'operator']).optional(),
  author_id: z.number().int().positive().optional(),
  is_read: z.boolean().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// Схемы для заметок
export const createNoteSchema = z.object({
  chat_id: z.number().int().positive(),
  content: z.string().min(1).max(10000),
  type: z.enum(['internal', 'public', 'resolution']).default('internal'),
  is_private: z.boolean().default(true),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  type: z.enum(['internal', 'public', 'resolution']).optional(),
  is_private: z.boolean().optional(),
});

// Схемы для кейсов
export const createCaseSchema = z.object({
  chat_id: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.number().int().positive().optional(),
});

export const updateCaseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.number().int().positive().optional(),
  resolved_at: z.string().datetime().optional(),
});

// Схемы для готовых ответов
export const createCannedResponseSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(10000),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
  shortcut: z.string().max(50).optional(),
});

export const updateCannedResponseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string()).optional(),
  shortcut: z.string().max(50).optional(),
});

// Схемы для файлов
export const fileUploadSchema = z.object({
  file: z.any().refine((file) => file && file.size > 0, 'Файл не может быть пустым'),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB по умолчанию
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']),
});

// Схемы для поиска
export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.enum(['chats', 'messages', 'users', 'operators']).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

// Схемы для аутентификации
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

// Схемы для WebSocket
export const websocketMessageSchema = z.object({
  type: z.enum(['ping', 'pong', 'subscribe', 'unsubscribe', 'chat_update', 'message_update']),
  data: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime().optional(),
});

// Экспортируем все схемы
export const schemas = {
  id: idSchema,
  pagination: paginationSchema,
  user: {
    create: createUserSchema,
    update: updateUserSchema,
  },
  operator: {
    create: createOperatorSchema,
    update: updateOperatorSchema,
    login: loginOperatorSchema,
  },
  chat: {
    create: createChatSchema,
    update: updateChatSchema,
    filters: chatFiltersSchema,
  },
  message: {
    create: createMessageSchema,
    update: updateMessageSchema,
    filters: messageFiltersSchema,
  },
  note: {
    create: createNoteSchema,
    update: updateNoteSchema,
  },
  case: {
    create: createCaseSchema,
    update: updateCaseSchema,
  },
  cannedResponse: {
    create: createCannedResponseSchema,
    update: updateCannedResponseSchema,
  },
  file: {
    upload: fileUploadSchema,
  },
  search: searchSchema,
  auth: {
    refresh: refreshTokenSchema,
  },
  websocket: websocketMessageSchema,
};
