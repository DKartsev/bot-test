export class AppError extends Error {
  code: string; status: number; meta?: unknown;
  constructor(code: string, message: string, status = 400, meta?: unknown) {
    super(message); this.code = code; this.status = status; this.meta = meta;
  }
}
