import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: SupabaseClient;
  private serviceClient: SupabaseClient;

  private constructor() {
    // Regular client for app operations
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Service role client for admin operations
    this.serviceClient = createClient(
      env.SUPABASE_URL, 
      env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    logger.info('Database connections initialized');
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  public getServiceClient(): SupabaseClient {
    return this.serviceClient;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('conversations')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (err) {
      logger.error({ err }, 'Database health check failed');
      return false;
    }
  }
}

export const db = DatabaseConnection.getInstance();
export const supabase = db.getClient();
export const supabaseService = db.getServiceClient();