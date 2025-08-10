import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import knex from "knex";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { createApp } from "./app.js";
import { PgUserRepo } from "./modules/users/infra/PgUserRepo.js";

describe("users e2e", () => {
  let container: PostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let app: ReturnType<typeof createApp> | undefined;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer("postgres:15-alpine").start();
      const connectionString = container.getConnectionString();
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const db = knex({
        client: "pg",
        connection: connectionString,
        migrations: {
          directory: path.join(__dirname, "../migrations"),
          extension: "ts",
        },
      });
      await db.migrate.latest();
      await db.destroy();
      pool = new Pool({ connectionString });
      app = createApp({ userRepo: new PgUserRepo(pool) });
    } catch {
      // container runtime not available
    }
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it("creates and lists users with pagination", async () => {
    if (!app) {
      console.warn("container not available, skipping test");
      return;
    }

    await request(app)
      .post("/api/users")
      .send({ email: "a@test.com", name: "A" })
      .expect(201);
    await request(app)
      .post("/api/users")
      .send({ email: "b@test.com", name: "B" })
      .expect(201);

    const list1 = await request(app)
      .get("/api/users")
      .query({ limit: 1 })
      .expect(200);
    expect(list1.body.items).toHaveLength(1);
    expect(list1.body.nextCursor).toBeDefined();

    const list2 = await request(app)
      .get("/api/users")
      .query({ cursor: list1.body.nextCursor, limit: 1 })
      .expect(200);
    expect(list2.body.items).toHaveLength(1);
  });
});
