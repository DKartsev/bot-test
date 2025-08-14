import { AppError } from "../../../utils/errorHandler.js";
import type { IUserRepo, User } from "@app/shared";
export class UserService {
  constructor(private readonly repo: IUserRepo) {}
  async register(email: string, name: string): Promise<User> {
    const exists = await this.repo.findByEmail(email);
    if (exists) throw new AppError("USER_EXISTS", "Already", 409);
    return this.repo.create({ email, name });
  }
}
