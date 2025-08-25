import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Создаем таблицу чатов для поддержки
  await knex.schema.createTable('support_chats', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('status').notNullable().defaultTo('waiting');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).notNullable().defaultTo('medium');
    table.string('source').notNullable().defaultTo('telegram');
    table.integer('operator_id').nullable();
    table.boolean('is_pinned').notNullable().defaultTo(false);
    table.boolean('is_important').notNullable().defaultTo(false);
    table.integer('unread_count').notNullable().defaultTo(0);
    table.specificType('tags', 'text[]').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Внешние ключи
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('operator_id').references('id').inTable('operators').onDelete('SET NULL');
  });

  // Создаем таблицу сообщений
  await knex.schema.createTable('support_messages', (table) => {
    table.increments('id').primary();
    table.integer('chat_id').notNullable();
    table.enum('author_type', ['user', 'operator']).notNullable();
    table.integer('author_id').notNullable();
    table.text('text').notNullable();
    table.jsonb('metadata').nullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    
    // Внешние ключи
    table.foreign('chat_id').references('id').inTable('support_chats').onDelete('CASCADE');
  });

  // Создаем индексы
  await knex.schema.raw('CREATE INDEX idx_support_chats_status ON support_chats(status)');
  await knex.schema.raw('CREATE INDEX idx_support_chats_operator_id ON support_chats(operator_id)');
  await knex.schema.raw('CREATE INDEX idx_support_chats_priority ON support_chats(priority)');
  await knex.schema.raw('CREATE INDEX idx_support_messages_chat_id ON support_messages(chat_id)');
  await knex.schema.raw('CREATE INDEX idx_support_messages_timestamp ON support_messages(timestamp)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('support_messages');
  await knex.schema.dropTable('support_chats');
}
