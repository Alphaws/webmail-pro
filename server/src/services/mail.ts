import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { ImapPool } from './imap-pool';

export class MailService {
  static async listFolders(accountId: number, vaultKey: string): Promise<any> {
    const client = await ImapPool.getClient(accountId, vaultKey);
    // Don't close connection here, it stays in pool
    return await client.list();
  }

  static async listMessages(accountId: number, vaultKey: string, folder: string = 'INBOX'): Promise<any> {
    const client = await ImapPool.getClient(accountId, vaultKey);
    const lock = await client.getMailboxLock(folder);
    try {
      const mailbox = client.mailbox;
      if (mailbox === false || mailbox.exists === 0) {
        return [];
      }

      const messages = [];
      const end = mailbox.exists;
      const start = Math.max(1, end - 19);
      
      for await (let message of client.fetch(`${start}:${end}`, { envelope: true, flags: true, size: true })) {
        const serializedMessage = JSON.parse(JSON.stringify(message, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));
        messages.push(serializedMessage);
      }
      return messages.reverse();
    } finally {
      lock.release();
    }
  }

  static async getMessageBody(accountId: number, vaultKey: string, folder: string, uid: string): Promise<any> {
    const client = await ImapPool.getClient(accountId, vaultKey);
    const lock = await client.getMailboxLock(folder);
    try {
      const message = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!message || !message.source) {
        throw new Error('Message source not found');
      }
      
      const parsed = await simpleParser(message.source);
      return {
        html: parsed.html || parsed.textAsHtml || parsed.text,
        text: parsed.text,
        subject: parsed.subject,
        from: parsed.from?.text,
        date: parsed.date
      };
    } finally {
      lock.release();
    }
  }
}
