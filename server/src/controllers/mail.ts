import { Request, Response } from 'express';
import { MailService } from '../services/mail';

export class MailController {
  static async folders(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey } = req.query;
    if (!accountId || !vaultKey) return res.status(400).json({ message: 'accountId and vaultKey required' });

    try {
      const folders = await MailService.listFolders(Number(accountId), String(vaultKey));
      res.json(folders);
    } catch (error: any) {
      console.error('Folders error:', error);
      if (error.authenticationFailed) return res.status(401).json({ message: 'IMAP Authentication failed' });
      res.status(500).json({ message: error.message });
    }
  }

  static async messages(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, folder } = req.query;
    if (!accountId || !vaultKey) return res.status(400).json({ message: 'accountId and vaultKey required' });

    try {
      const messages = await MailService.listMessages(Number(accountId), String(vaultKey), String(folder || 'INBOX'));
      res.json(messages);
    } catch (error: any) {
      console.error('Messages error:', error);
      if (error.authenticationFailed) return res.status(401).json({ message: 'IMAP Authentication failed' });
      res.status(500).json({ message: error.message });
    }
  }

  static async body(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, folder, uid } = req.query;
    if (!accountId || !vaultKey || !uid) return res.status(400).json({ message: 'accountId, vaultKey and uid required' });

    try {
      const body = await MailService.getMessageBody(Number(accountId), String(vaultKey), String(folder || 'INBOX'), String(uid));
      res.json(body);
    } catch (error: any) {
      console.error('Body error:', error);
      if (error.authenticationFailed) return res.status(401).json({ message: 'IMAP Authentication failed' });
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, folder, uid } = req.body;
    if (!accountId || !vaultKey || !uid) return res.status(400).json({ message: 'accountId, vaultKey and uid required' });

    try {
      await MailService.deleteMessage(Number(accountId), String(vaultKey), String(folder || 'INBOX'), String(uid));
      res.json({ message: 'Message deleted' });
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  static async archive(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, folder, uid } = req.body;
    if (!accountId || !vaultKey || !uid) return res.status(400).json({ message: 'accountId, vaultKey and uid required' });

    try {
      await MailService.archiveMessage(Number(accountId), String(vaultKey), String(folder || 'INBOX'), String(uid));
      res.json({ message: 'Message archived' });
    } catch (error: any) {
      console.error('Archive error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  static async toggleSeen(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, folder, uid, seen } = req.body;
    if (!accountId || !vaultKey || !uid) return res.status(400).json({ message: 'accountId, vaultKey and uid required' });

    try {
      await MailService.updateFlags(
        Number(accountId), 
        String(vaultKey), 
        String(folder || 'INBOX'), 
        String(uid), 
        ['\\Seen'], 
        seen ? 'add' : 'remove'
      );
      res.json({ message: 'Message flags updated' });
    } catch (error: any) {
      console.error('ToggleSeen error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  static async send(req: Request, res: Response): Promise<any> {
    const { accountId, vaultKey, to, subject, body, inReplyTo, references } = req.body;
    if (!accountId || !vaultKey || !to) return res.status(400).json({ message: 'accountId, vaultKey and recipient (to) required' });

    try {
      const info = await MailService.sendMail(Number(accountId), String(vaultKey), to, subject, body, inReplyTo, references);
      res.json({ message: 'Email sent successfully', messageId: info.messageId });
    } catch (error: any) {
      console.error('Send mail error:', error);
      res.status(500).json({ message: error.message });
    }
  }
}
