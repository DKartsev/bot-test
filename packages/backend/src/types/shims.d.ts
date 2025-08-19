// Minimal shims to keep TypeScript happy when node_modules types are unavailable

// process shim
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type FastifyRequest = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type FastifyReply = any;
  export interface FastifyInstance {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: (...args: any[]) => Promise<void> | void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    head: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addHook: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decorate: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setErrorHandler: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listen: (opts: { port: number; host?: string }) => Promise<void>;
    log: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info: (...args: any[]) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warn: (...args: any[]) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (...args: any[]) => void;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pg?: any;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Fastify: (opts?: any) => FastifyInstance;
  export default Fastify;
}

declare module '@fastify/rate-limit' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any;
  export default plugin;
}

declare module '@fastify/multipart' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any;
  export default plugin;
}

declare module 'telegraf' {
  export class Telegraf<C extends Context = Context> {
    constructor(token: string);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch(handler: (err: unknown, ctx: C) => any): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string | any, handler: (ctx: C, next: () => Promise<void>) => Promise<void> | void): void;
  }
  export interface Context {
    chat?: { id?: number | string };
    updateType?: string;
    message: { text?: string };
    sendChatAction: (action: string) => Promise<void>;
    reply: (text: string) => Promise<void>;
  }
}

declare module 'telegraf/filters' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const message: (...args: any[]) => any;
}

declare module 'telegraf/types' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Update = any;
}

declare module 'vitest' {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const expect: any;
  export const vi: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (...args: unknown[]) => any;
    mock: (id: string, factory: () => unknown) => void;
    doMock: (id: string, factory: () => unknown) => void;
    clearAllMocks: () => void;
    restoreAllMocks: () => void;
  };
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
}

