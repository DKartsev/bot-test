declare module "zod";
export type ZodTypeAny = any;
export interface ZodSchema {
  safeParse: (data: unknown) => any;
}
export const z: any;
