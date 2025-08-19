import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_telegram_id: string;
          status: string;
          handoff: string;
          assignee_id?: string;
          assignee_name?: string;
          assigned_at?: string;
          category_id?: string;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: string;
          content: string | null;
          media_urls?: string[] | null;
          media_types?: string[] | null;
          transcript?: string | null;
          vision_summary?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          color: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      operator_notes: {
        Row: {
          id: string;
          conversation_id: string;
          message_id?: string | null;
          author_name: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['operator_notes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['operator_notes']['Insert']>;
      };
      saved_replies: {
        Row: {
          id: string;
          title: string;
          content: string;
          tags: string[];
          created_by?: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_replies']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['saved_replies']['Insert']>;
      };
      cases: {
        Row: {
          id: string;
          conversation_id: string;
          title: string;
          summary: string;
          link: string;
          created_by?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cases']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['cases']['Insert']>;
      };
      bot_responses: {
        Row: {
          id: string;
          question: string;
          draft: string;
          answer: string;
          confidence: number;
          escalate: boolean;
          lang?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bot_responses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bot_responses']['Insert']>;
      };
      bot_feedback: {
        Row: {
          id: string;
          response_id: string;
          useful: boolean;
          rating?: number;
          note?: string;
          correction?: string;
          operator_id?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bot_feedback']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bot_feedback']['Insert']>;
      };
    };
  };
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  public readonly client: SupabaseClient<Database>;

  private constructor() {
    // Extract Supabase URL and key from DATABASE_URL or use separate env vars
    const supabaseUrl = process.env.SUPABASE_URL || env.PUBLIC_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY is required');
    }

    this.client = createClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    logger.info('Database connection initialized.');
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('conversations')
        .select('id')
        .limit(1);
      if (error) throw error;
      return { ok: true };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error({ err: error }, 'Database health check failed');
      return { ok: false, error: error.message };
    }
  }
}

const dbInstance = DatabaseConnection.getInstance();
export const supabase = dbInstance.client;
export const dbHealthCheck = () => dbInstance.healthCheck();
