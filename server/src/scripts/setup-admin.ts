import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import db from '../database/db';

function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

async function createMasterUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  
  if (!password) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is required.');
    process.exit(1);
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  const vaultSalt = generateSalt();

  try {
    await db('users').insert({
      username,
      password_hash: passwordHash,
      vault_salt: vaultSalt
    });
    console.log(`Master user created: ${username}`);
  } catch (error: any) {
    if (error.code === '23505') { // PostgreSQL unique violation code
      console.log('Master user already exists.');
    } else {
      console.error('Error creating user:', error);
    }
  } finally {
    await db.destroy();
  }
}

createMasterUser();
