import { Request, Response } from 'express';
import db from '../database/db';
import { Vault } from '../utils/vault';

export class AccountController {
  static async add(req: Request, res: Response): Promise<any> {
    const { 
      email, imap_host, imap_port, imap_secure, 
      smtp_host, smtp_port, smtp_secure, 
      password, vault_key, display_name
    } = req.body;
    const user_id = (req as any).user.id;

    if (!vault_key) {
      return res.status(400).json({ message: 'Vault key required for encryption' });
    }

    try {
      const encryptedPassword = Vault.encrypt(password, vault_key);

      const [id] = await db('accounts').insert({
        user_id,
        email,
        imap_host,
        imap_port: imap_port || 993,
        imap_secure: imap_secure !== undefined ? imap_secure : true,
        smtp_host,
        smtp_port: smtp_port || 587,
        smtp_secure: smtp_secure !== undefined ? smtp_secure : false,
        encrypted_password: encryptedPassword,
        display_name: display_name || email
      }).returning('id');

      res.status(201).json({ id: id.id, email });
    } catch (error) {
      console.error('Add account error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async list(req: Request, res: Response): Promise<any> {
    const user_id = (req as any).user.id;

    try {
      const accounts = await db('accounts')
        .where({ user_id })
        .select('id', 'email', 'imap_host', 'imap_port', 'imap_secure', 'smtp_host', 'smtp_port', 'smtp_secure', 'display_name', 'created_at');
      
      res.json(accounts);
    } catch (error) {
      console.error('List accounts error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async update(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const { 
      email, imap_host, imap_port, imap_secure, 
      smtp_host, smtp_port, smtp_secure, 
      password, vault_key, display_name 
    } = req.body;
    const user_id = (req as any).user.id;

    try {
      const updateData: any = {
        email, imap_host, imap_port, imap_secure, 
        smtp_host, smtp_port, smtp_secure, display_name,
        updated_at: new Date()
      };

      if (password && vault_key) {
        updateData.encrypted_password = Vault.encrypt(password, vault_key);
      }

      const count = await db('accounts').where({ id, user_id }).update(updateData);
      
      if (count === 0) return res.status(404).json({ message: 'Account not found' });
      res.json({ message: 'Account updated' });
    } catch (error) {
      console.error('Update account error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async delete(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const user_id = (req as any).user.id;

    try {
      const count = await db('accounts').where({ id, user_id }).del();
      if (count === 0) return res.status(404).json({ message: 'Account not found' });
      res.json({ message: 'Account deleted' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
