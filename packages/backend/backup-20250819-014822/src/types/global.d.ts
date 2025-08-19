declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT: string;
      DATABASE_URL: string;
      TELEGRAM_BOT_TOKEN: string;
      OPENAI_API_KEY: string;
      LOG_LEVEL: string;
      CORS_ORIGIN: string;
      ENABLE_DOCS: string;
      PUBLIC_URL?: string;
      ADMIN_IP_ALLOWLIST: string;
      ADMIN_RATE_LIMIT_MAX: string;
    }
  }

  let app: {
    log: {
      info: (obj: unknown, msg: string) => void;
      warn: (msg: string) => void;
      error: (obj: unknown, msg: string) => void;
    };
  };
}

export {};