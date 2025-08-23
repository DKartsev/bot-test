// Глобальные типы для исправления проблем компиляции

declare module 'fastify' {
  export interface FastifyPluginAsync<T = any> {
    (fastify: any, options?: T): Promise<void>;
  }

  export interface FastifyBaseLogger {
    info(msg: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
  }

  export interface FastifyError extends Error {
    statusCode?: number;
    code?: string;
  }

  export interface FastifyReply {
    send(payload?: any): FastifyReply;
    status(statusCode: number): FastifyReply;
    header(key: string, value: string): FastifyReply;
  }

  export interface FastifyRequest {
    body?: any;
    params?: any;
    query?: any;
    headers?: any;
  }

  export interface FastifyInstance {
    register(plugin: any, options?: any): Promise<void>;
    get(path: string, handler: any): void;
    post(path: string, handler: any): void;
    put(path: string, handler: any): void;
    delete(path: string, handler: any): void;
    addHook(name: string, handler: any): void;
    listen(options: any): Promise<void>;
    close(): Promise<void>;
  }
}

declare module 'vitest' {
  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
  export const vi: {
    fn: <T extends (...args: any[]) => any>(implementation?: T) => T;
    mock: (id: string, factory: () => any) => void;
    doMock: (id: string, factory: () => any) => void;
    clearAllMocks: () => void;
    restoreAllMocks: () => void;
    spyOn: <T extends object, K extends keyof T>(obj: T, method: K) => any;
    mocked: <T>(obj: T) => T;
  };
}

declare module 'telegraf' {
  export interface Context {
    message?: any;
    update?: any;
  }

  export class Telegraf {
    constructor(token: string);
    start(): void;
    stop(): void;
    webhookCallback(path: string): any;
    handleUpdate(update: any): void;
    telegram: any;
  }
}

// Глобальные типы для исправления других ошибок
declare global {
  interface RetrievalResult {
    content: string;
    metadata?: any;
  }
}
