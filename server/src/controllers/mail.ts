import { Request, Response } from 'express';
import { MailService } from '../services/mail';

export class MailController {
  static async folders(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey } = req.query;

    if (!accountId || !vaultKey) {
      return res.status(400).json({ message: 'accountId and vaultKey required' });
    }

    try {
      const folders = await MailService.listFolders(Number(accountId), String(vaultKey));
      res.json(folders);
    } catch (error: any) {
      console.error('Folders error:', error);
      if (error.authenticationFailed) {
        return res.status(401).json({ message: 'IMAP Authentication failed' });
      }
      res.status(500).json({ message: error.message });
    }
  }

  static async messages(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, folder } = req.query;

    if (!accountId || !vaultKey) {
      return res.status(400).json({ message: 'accountId and vaultKey required' });
    }

    try {
      const messages = await MailService.listMessages(Number(accountId), String(vaultKey), String(folder || 'INBOX'));
      res.json(messages);
    } catch (error: any) {
      console.error('Messages error:', error);
      if (error.authenticationFailed) {
        return res.status(401).json({ message: 'IMAP Authentication failed' });
      }
      res.status(500).json({ message: error.message });
    }
  }

  static async body(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, folder, uid } = req.query;

    if (!accountId || !vaultKey || !uid) {
      return res.status(400).json({ message: 'accountId, vaultKey and uid required' });
    }

    try {
      const body = await MailService.getMessageBody(
        Number(accountId), 
        String(vaultKey), 
        String(folder || 'INBOX'), 
        String(uid)
      );
      res.json(body);
    } catch (error: any) {
      console.error('Body error:', error);
      if (error.authenticationFailed) {
        return res.status(401).json({ message: 'IMAP Authentication failed' });
      }
      res.status(500).json({ message: error.message });
    }
  }
}
