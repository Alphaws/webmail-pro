import * as bip39 from 'bip39';
import CryptoJS from 'crypto-js';
import bcrypt from 'bcryptjs';
import db from '../database/db';
import { Vault } from '../utils/vault';

export class RecoveryService {
  static async generateRecoveryPhrase(userId: number, vaultKey: string): Promise<string> {
    const mnemonic = bip39.generateMnemonic(256); // 24 words
    const recoveryKey = CryptoJS.PBKDF2(mnemonic, 'recovery-salt', {
      keySize: 512 / 32,
      iterations: 10000
    }).toString();

    const encryptedVaultKey = Vault.encrypt(vaultKey, recoveryKey);
    const recoveryHash = await bcrypt.hash(mnemonic, 10);

    await db('users').where({ id: userId }).update({
      recovery_encrypted_vault_key: encryptedVaultKey,
      recovery_hash: recoveryHash
    });

    return mnemonic;
  }

  static async recoverVault(username: string, mnemonic: string, newPassword: string): Promise<any> {
    const user = await db('users').where({ username }).first();
    if (!user || !user.recovery_hash) {
      throw new Error('Recovery not set for this identity');
    }

    const isValid = await bcrypt.compare(mnemonic, user.recovery_hash);
    if (!isValid) {
      throw new Error('Invalid recovery phrase');
    }

    const recoveryKey = CryptoJS.PBKDF2(mnemonic, 'recovery-salt', {
      keySize: 512 / 32,
      iterations: 10000
    }).toString();

    const oldVaultKey = Vault.decrypt(user.recovery_encrypted_vault_key, recoveryKey);
    if (!oldVaultKey) {
      throw new Error('Failed to decrypt transmission vault');
    }

    const newVaultKey = Vault.deriveKey(newPassword, user.vault_salt);
    const accounts = await db('accounts').where({ user_id: user.id });

    await db.transaction(async trx => {
      for (const acc of accounts) {
        const plainPassword = Vault.decrypt(acc.encrypted_password, oldVaultKey);
        const newEncryptedPassword = Vault.encrypt(plainPassword, newVaultKey);
        
        await trx('accounts').where({ id: acc.id }).update({
          encrypted_password: newEncryptedPassword
        });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      const newEncryptedVaultKey = Vault.encrypt(newVaultKey, recoveryKey);

      await trx('users').where({ id: user.id }).update({
        password_hash: newPasswordHash,
        recovery_encrypted_vault_key: newEncryptedVaultKey
      });
    });

    return { success: true, newVaultKey };
  }
}
