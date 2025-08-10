declare module 'zod';
export type ZodTypeAny = any;
export interface ZodSchema<T = any> {
  safeParse: (data: unknown) => any;
}
export const z: any;
