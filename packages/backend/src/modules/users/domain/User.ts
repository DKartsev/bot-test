export type User = { id: string; email: string; name: string };
export interface IUserRepo {
  findByEmail(email: string): Promise<User | null>;
  create(input: Omit<User, "id">): Promise<User>;
  list(params: {
    cursor?: string;
    limit: number;
  }): Promise<import("../../../validation/pagination.js").ListResult<User>>;
}
