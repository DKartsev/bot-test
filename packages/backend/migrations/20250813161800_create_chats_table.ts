import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("chats", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("status").notNullable().defaultTo("new");
    table.string("priority").notNullable().defaultTo("normal");
    table
      .uuid("assignee_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("status_reason");
    table.specificType("tags", "text[]");
    table.timestamp("last_user_message_at");
    table.timestamp("last_operator_message_at");
    table.timestamps(true, true); // created_at, updated_at
  });

  await knex.schema.table("chats", (table) => {
    table.index("status");
    table.index("assignee_id");
    table.index("updated_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("chats");
}
