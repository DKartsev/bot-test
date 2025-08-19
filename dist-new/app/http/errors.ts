export class AppError extends Error {
  code: string;
  status: number;
  meta?: unknown;
  constructor(code: string, message: string, status = 400, meta?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

export const mapDomainError = (e: unknown): AppError => {
  if (e instanceof AppError) return e;
  if ((e as Error)?.message === 'USER_EXISTS') {
    return new AppError('USER_EXISTS', 'User exists', 409);
  }
  return new AppError('INTERNAL_ERROR', 'Internal error', 500);
};
