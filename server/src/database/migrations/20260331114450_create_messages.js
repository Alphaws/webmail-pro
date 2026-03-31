/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('messages', table => {
    table.increments('id').primary();
    table.integer('account_id').unsigned().notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.string('folder').notNullable();
    table.string('uid').notNullable();
    table.string('message_id').nullable();
    table.string('subject').nullable();
    table.string('from_name').nullable();
    table.string('from_address').nullable();
    table.datetime('date').nullable();
    table.integer('size').nullable();
    table.jsonb('flags').nullable();
    table.jsonb('envelope').nullable();
    table.string('modseq').nullable();
    
    table.unique(['account_id', 'folder', 'uid']);
    table.index(['account_id', 'folder']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('messages');
};
