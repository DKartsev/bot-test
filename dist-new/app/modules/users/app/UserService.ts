import { AppError } from '../../../utils/errorHandler.js';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface IUserRepo {
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name: string }): Promise<User>;
  list(opts: { limit: number; cursor?: string }): Promise<{
    items: User[];
    nextCursor?: string;
  }>;
}

export class UserService {
  constructor(private readonly repo: IUserRepo) {}
  async register(email: string, name: string): Promise<User> {
    const exists = await this.repo.findByEmail(email);
    if (exists) throw new AppError('User already exists', 409);
    return this.repo.create({ email, name });
  }
}
