import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Создаем новую таблицу users с правильной структурой
  await knex.schema.createTable('users_new', (table) => {
    table.increments('id').primary();
    table.integer('telegram_id').notNullable().unique();
    table.string('username').nullable();
    table.string('first_name').notNullable();
    table.string('last_name').nullable();
    table.string('avatar_url').nullable();
    table.decimal('balance', 10, 2).notNullable().defaultTo(0);
    table.integer('deals_count').notNullable().defaultTo(0);
    table.specificType('flags', 'text[]').nullable();
    table.boolean('is_blocked').notNullable().defaultTo(false);
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_activity').nullable();
  });

  // Создаем индекс для telegram_id
  await knex.schema.raw('CREATE INDEX idx_users_telegram_id ON users_new(telegram_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users_new');
}
