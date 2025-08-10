import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createDatabaseConfig } from '../config/database';
import { Conversation, Message } from '../types/conversation';
import { NotFoundError, ValidationError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const dbConfig = createDatabaseConfig();
const supabase = createClient(dbConfig.url, dbConfig.key);

const createConversationSchema = z.object({
  user_telegram_id: z.string(),
  chat_telegram_id: z.string().optional(),
  username: z.string().nullable().optional(),
});

const updateConversationSchema = z.object({
  status: z.enum(['open', 'closed', 'escalated']).optional(),
  handoff: z.enum(['bot', 'human']).optional(),
  assignee_name: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export class ConversationService {
  async getOrCreateConversation(params: z.infer<typeof createConversationSchema>): Promise<Conversation> {
    const validatedParams = createConversationSchema.parse(params);
    
    // Try to find existing open conversation
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_telegram_id', validatedParams.user_telegram_id)
      .eq('status', 'open')
      .maybeSingle();

    if (findError) {
      logger.error({ error: findError }, 'Failed to find conversation');
      throw new Error('Database error');
    }

    if (existing) {
      return existing as Conversation;
    }

    // Create new conversation
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        user_telegram_id: validatedParams.user_telegram_id,
        chat_telegram_id: validatedParams.chat_telegram_id,
        username: validatedParams.username,
        status: 'open',
        handoff: 'bot',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (createError || !created) {
      logger.error({ error: createError }, 'Failed to create conversation');
      throw new Error('Failed to create conversation');
    }

    return created as Conversation;
  }

  async getConversation(id: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        category:categories(id, name, color)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Conversation');
    }

    return data as Conversation;
  }

  async updateConversation(id: string, updates: z.infer<typeof updateConversationSchema>): Promise<Conversation> {
    const validatedUpdates = updateConversationSchema.parse(updates);
    
    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...validatedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        category:categories(id, name, color)
      `)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new NotFoundError('Conversation');
      }
      logger.error({ error }, 'Failed to update conversation');
      throw new Error('Failed to update conversation');
    }

    return data as Conversation;
  }

  async getConversations(filters: {
    status?: string;
    handoff?: string;
    category_id?: string;
    assignee_name?: string;
    search?: string;
    limit?: number;
    cursor?: string;
  }): Promise<Conversation[]> {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        category:categories(id, name, color)
      `)
      .order('updated_at', { ascending: false })
      .limit(filters.limit || 20);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.handoff) query = query.eq('handoff', filters.handoff);
    if (filters.category_id) query = query.eq('category_id', filters.category_id);
    if (filters.assignee_name) query = query.eq('assignee_name', filters.assignee_name);
    if (filters.search) query = query.ilike('user_telegram_id', `%${filters.search}%`);
    if (filters.cursor) query = query.lt('updated_at', filters.cursor);

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch conversations');
      throw new Error('Failed to fetch conversations');
    }

    return (data || []) as Conversation[];
  }

  async claimConversation(id: string, assigneeName: string): Promise<Conversation> {
    // Check if already assigned
    const { data: current } = await supabase
      .from('conversations')
      .select('assignee_name')
      .eq('id', id)
      .single();

    if (current?.assignee_name) {
      throw new ValidationError(`Conversation already assigned to ${current.assignee_name}`);
    }

    return this.updateConversation(id, {
      assignee_name: assigneeName,
    });
  }

  async takeoverConversation(id: string, assigneeName: string): Promise<Conversation> {
    return this.updateConversation(id, {
      assignee_name: assigneeName,
    });
  }
}

export const conversationService = new ConversationService();