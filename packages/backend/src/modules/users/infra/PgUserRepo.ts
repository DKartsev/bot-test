import type { IUserRepo, User } from "@app/shared";
import type { Pool } from "pg";

export class PgUserRepo implements IUserRepo {
  constructor(private readonly db: Pool) {}
  
  async findByEmail(email: string): Promise<User | null> {
    const r = await this.db.query<User>(
      "SELECT id,email,name FROM users WHERE email = $1",
      [email],
    );
    return r.rows[0] ?? null;
  }
  
  async create({ email, name }: Omit<User, "id">): Promise<User> {
    const r = await this.db.query<User>(
      "INSERT INTO users(email,name) VALUES ($1,$2) RETURNING id,email,name",
      [email, name],
    );
    const user = r.rows[0];
    if (!user) {
      throw new Error("Failed to create user");
    }
    return user;
  }

  async list({
    cursor,
    limit = 20,
  }: {
    cursor?: string;
    limit?: number;
  }): Promise<{ items: User[]; nextCursor?: string }> {
    const values: (string | number)[] = [];
    let query = "SELECT id,email,name FROM users ORDER BY created_at DESC LIMIT $1";
    if (cursor) {
      values.push(cursor);
      query = "SELECT id,email,name FROM users WHERE created_at < $1 ORDER BY created_at DESC LIMIT $2";
      values.push(limit + 1);
    } else {
      values.push(limit + 1);
    }
    const r = await this.db.query<User>(query, values);
    const rows = r.rows;
    let nextCursor: string | undefined;
    if (rows.length > limit) {
      const next = rows.pop();
      if (next) {
        nextCursor = next.created_at || next.id;
      }
    }
    return {
      items: rows,
      ...(nextCursor ? { nextCursor } : {}),
    };
  }
}
