<<<<<<< HEAD
import type { FastifyInstance } from "fastify";
import type { IUserRepo, User } from "../app/UserService.js";

export class PgUserRepo implements IUserRepo {
  constructor(private readonly app: FastifyInstance) {}

  private get db() {
    return this.app.pg;
  }

=======
import type { IUserRepo, User } from "@app/shared";
import type { Pool } from "pg";

export class PgUserRepo implements IUserRepo {
  constructor(private readonly db: Pool) {}
  
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
  async findByEmail(email: string): Promise<User | null> {
    const r = await this.db.query<User>(
      "SELECT id,email,name FROM users WHERE email = $1",
      [email],
    );
    return r.rows[0] ?? null;
  }
<<<<<<< HEAD

=======
  
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
  async create({ email, name }: Omit<User, "id">): Promise<User> {
    const r = await this.db.query<User>(
      "INSERT INTO users(email,name) VALUES ($1,$2) RETURNING id,email,name",
      [email, name],
    );
<<<<<<< HEAD
    if (!r.rows[0]) {
      throw new Error("Failed to create user");
    }
    return r.rows[0];
=======
    const user = r.rows[0];
    if (!user) {
      throw new Error("Failed to create user");
    }
    return user;
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
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
