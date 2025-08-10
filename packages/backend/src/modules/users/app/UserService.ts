import { AppError } from '../../../http/errors/AppError.js';
import type { IUserRepo, User } from '../domain/User.js';
export class UserService {
  constructor(private readonly repo: IUserRepo) {}
  async register(email: string, name: string): Promise<User> {
    const exists = await this.repo.findByEmail(email);
    if (exists) throw new AppError('USER_EXISTS','Already',409);
    return this.repo.create({ email, name });
  }
}
