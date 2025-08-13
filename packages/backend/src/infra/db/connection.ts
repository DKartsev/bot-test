import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// Note: The prompt mentions raw Postgres, but the code uses Supabase.
// I will stick with the existing Supabase client for now.
// The DATABASE_URL from env is used by Supabase client internally.

class DatabaseConnection {
  private static instance: DatabaseConnection;
  public readonly client: SupabaseClient;

  private constructor() {
    // The Supabase client uses the DATABASE_URL (which includes the service role key)
    // for server-side operations. No need for two separate clients if configured correctly.
    this.client = createClient(
      env.PUBLIC_URL || "http://localhost:54321",
      env.DATABASE_URL,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    logger.info("Database connection initialized.");
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      // A simple query to check the connection.
      const { error } = await this.client
        .from("bot_responses")
        .select("id")
        .limit(1);
      if (error) throw error;
      return { ok: true };
    } catch (err: any) {
      logger.error({ err }, "Database health check failed");
      return { ok: false, error: err.message };
    }
  }
}

const dbInstance = DatabaseConnection.getInstance();
export const supabase = dbInstance.client;
export const dbHealthCheck = () => dbInstance.healthCheck();
