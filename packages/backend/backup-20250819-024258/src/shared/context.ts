import { AsyncLocalStorage } from 'node:async_hooks';
export type Ctx = { requestId: string };
export const als = new AsyncLocalStorage<Ctx>();
export const withCtx = <T>(ctx: Ctx, fn: () => T) => als.run(ctx, fn);
export const getCtx = () => als.getStore();
