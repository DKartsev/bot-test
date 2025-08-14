import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("chat_assignments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("chat_id")
      .notNullable()
      .references("id")
      .inTable("chats")
      .onDelete("CASCADE");
    table
      .uuid("assignee_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamp("assigned_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("unassigned_at");
  });

  await knex.schema.table("chat_assignments", (table) => {
    table.index(["chat_id", "assignee_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("chat_assignments");
}
