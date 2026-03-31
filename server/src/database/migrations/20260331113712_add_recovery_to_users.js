/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table.text('recovery_encrypted_vault_key').nullable(); // Vault key encrypted with recovery phrase key
    table.text('recovery_hash').nullable(); // Salt + Hash of recovery phrase for verification
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('recovery_encrypted_vault_key');
    table.dropColumn('recovery_hash');
  });
};
