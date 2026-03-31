/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('accounts', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('imap_host').notNullable();
    table.integer('imap_port').defaultTo(993);
    table.boolean('imap_secure').defaultTo(true);
    table.string('smtp_host').notNullable();
    table.integer('smtp_port').defaultTo(587);
    table.boolean('smtp_secure').defaultTo(false); // TLS/STARTTLS usually
    table.text('encrypted_password').notNullable();
    table.string('display_name');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('accounts');
};
