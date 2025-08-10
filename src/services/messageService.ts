import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createDatabaseConfig } from '../config/database';
import { Message } from '../types/conversation';
import { NotFoundError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const dbConfig = createDatabaseConfig();
const supabase = createClient(dbConfig.url, dbConfig.key);

const createMessageSchema = z.object({
  conversation_id: z.string(),
  sender: z.enum(['user', 'bot', 'operator']),
  content: z.string().nullable(),
  media_urls: z.array(z.string()).optional(),
  media_types: z.array(z.string()).optional(),
});

export class MessageService {
  async createMessage(params: z.infer<typeof createMessageSchema>): Promise<Message> {
    const validatedParams = createMessageSchema.parse(params);
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...validatedParams,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !data) {
      logger.error({ error }, 'Failed to create message');
      throw new Error('Failed to create message');
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedParams.conversation_id);

    return data as Message;
  }

  async getMessages(conversationId: string, options: {
    limit?: number;
    cursor?: string;
  } = {}): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(options.limit || 50);

    if (options.cursor) {
      query = query.gt('created_at', options.cursor);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch messages');
      throw new Error('Failed to fetch messages');
    }

    return (data || []) as Message[];
  }

  async updateMessage(id: string, updates: {
    content?: string;
    transcript?: string;
    vision_summary?: string;
  }): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new NotFoundError('Message');
      }
      logger.error({ error }, 'Failed to update message');
      throw new Error('Failed to update message');
    }

    return data as Message;
  }
}

export const messageService = new MessageService();