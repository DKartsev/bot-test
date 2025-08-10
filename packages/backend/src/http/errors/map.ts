import { AppError } from './AppError.js';
export const mapDomainError = (e: unknown) => {
  if ((e as Error).message === 'USER_EXISTS') return new AppError('USER_EXISTS','User exists',409);
  return e;
};
