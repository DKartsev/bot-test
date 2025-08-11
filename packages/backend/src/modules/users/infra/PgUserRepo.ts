import type { IUserRepo, User } from "../domain/User.js";
import type { Pool } from "pg";
export class PgUserRepo implements IUserRepo {
  constructor(private readonly db: Pool) {}
  async findByEmail(email: string): Promise<User | null> {
    const r = await this.db.query(
      "SELECT id,email,name FROM users WHERE email = $1",
      [email],
    );
    return r.rows[0] ?? null;
  }
  async create({ email, name }: Omit<User, "id">): Promise<User> {
    const r = await this.db.query(
      "INSERT INTO users(email,name) VALUES ($1,$2) RETURNING id,email,name",
      [email, name],
    );
    return r.rows[0];
  }

  async list({
    cursor,
    limit = 20,
  }: {
    cursor?: string;
    limit?: number;
  }): Promise<import("../../../validation/pagination.js").ListResult<User>> {
    const values: unknown[] = [];
    let query = "SELECT id,email,name FROM users ORDER BY id ASC LIMIT $1";
    if (cursor) {
      values.push(cursor);
      query =
        "SELECT id,email,name FROM users WHERE id > $1 ORDER BY id ASC LIMIT $2";
      values.push(limit + 1);
    } else {
      values.push(limit + 1);
    }
    const r = await this.db.query(query, values);
    let rows = r.rows as User[];
    let nextCursor: string | undefined;
    if (rows.length > limit) {
      const next = rows.pop() as User;
      nextCursor = next.id;
    }
    return {
      items: rows,
      ...(nextCursor ? { nextCursor } : {}),
    };
  }
}
