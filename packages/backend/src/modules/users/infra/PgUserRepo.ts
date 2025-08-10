import type { IUserRepo, User } from '../domain/User.js';
import type { Pool } from 'pg';
export class PgUserRepo implements IUserRepo {
  constructor(private readonly db: Pool) {}
  async findByEmail(email: string): Promise<User | null> {
    const r = await this.db.query('SELECT id,email,name FROM users WHERE email = $1', [email]);
    return r.rows[0] ?? null;
  }
  async create({ email, name }: Omit<User,'id'>): Promise<User> {
    const r = await this.db.query(
      'INSERT INTO users(email,name) VALUES ($1,$2) RETURNING id,email,name',
      [email, name]
    );
    return r.rows[0];
  }
}
