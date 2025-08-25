import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('operators', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.enum('role', ['operator', 'senior_operator', 'admin']).notNullable().defaultTo('operator');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('max_chats').notNullable().defaultTo(5);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_activity').nullable();
  });

  // Создаем индексы для оптимизации
  await knex.schema.raw('CREATE INDEX idx_operators_email ON operators(email)');
  await knex.schema.raw('CREATE INDEX idx_operators_role ON operators(role)');
  await knex.schema.raw('CREATE INDEX idx_operators_active ON operators(is_active)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('operators');
}
