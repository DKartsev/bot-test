export type User = { id: string; email: string; name: string };
export interface IUserRepo {
  findByEmail(email: string): Promise<User | null>;
  create(input: Omit<User, 'id'>): Promise<User>;
}
