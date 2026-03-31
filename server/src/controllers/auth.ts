import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db';
import { Vault } from '../utils/vault';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export class AuthController {
  static async register(req: Request, res: Response): Promise<any> {
    const { username, password } = req.body;

    try {
      const existingUser = await db('users').where({ username }).first();
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const vaultSalt = Vault.generateSalt();

      await db('users').insert({
        username,
        password_hash: passwordHash,
        vault_salt: vaultSalt
      });

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async login(req: Request, res: Response): Promise<any> {
    const { username, password } = req.body;

    try {
      const user = await db('users').where({ username }).first();
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const vaultKey = Vault.deriveKey(password, user.vault_salt);
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

      res.json({
        token,
        vaultKey,
        username: user.username
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async changePassword(req: Request, res: Response): Promise<any> {
    const { oldPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    try {
      const user = await db('users').where({ id: userId }).first();
      
      const isValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ message: 'Current master password incorrect' });
      }

      const oldVaultKey = Vault.deriveKey(oldPassword, user.vault_salt);
      const newVaultKey = Vault.deriveKey(newPassword, user.vault_salt);

      // 1. Fetch all accounts for re-encryption
      const accounts = await db('accounts').where({ user_id: userId });

      // 2. Perform re-encryption in a transaction
      await db.transaction(async trx => {
        for (const acc of accounts) {
          const plainPassword = Vault.decrypt(acc.encrypted_password, oldVaultKey);
          const newEncryptedPassword = Vault.encrypt(plainPassword, newVaultKey);
          
          await trx('accounts').where({ id: acc.id }).update({
            encrypted_password: newEncryptedPassword
          });
        }

        // 3. Update master password hash
        const newHash = await bcrypt.hash(newPassword, 10);
        await trx('users').where({ id: userId }).update({
          password_hash: newHash
        });
      });

      res.json({ 
        message: 'Master password updated and vault re-keyed',
        newVaultKey // Return new key so client can continue session
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to update master password' });
    }
  }
}
