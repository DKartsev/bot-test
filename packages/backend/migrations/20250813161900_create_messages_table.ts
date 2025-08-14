import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("chat_id")
      .notNullable()
      .references("id")
      .inTable("chats")
      .onDelete("CASCADE");
    table.string("sender_type").notNullable(); // 'user', 'operator', 'bot'
    table.string("sender_id");
    table.text("content").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.table("messages", (table) => {
    table.index("chat_id");
    table.index("created_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("messages");
}
