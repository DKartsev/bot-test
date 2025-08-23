import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id: number;
        email: string;
        role: string;
        operatorId?: number;
      };
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

export {};
