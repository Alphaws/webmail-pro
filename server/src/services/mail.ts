import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { ImapPool } from './imap-pool';
import { Vault } from '../utils/vault';
import db from '../database/db';

export class MailService {
  static async listFolders(accountId: number, vaultKey: string): Promise<any> {
    const client = await ImapPool.getClient(accountId, vaultKey);
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
        const serializedMessage = {
          ...message,
          flags: message.flags ? Array.from(message.flags) : [],
          modseq: message.modseq ? message.modseq.toString() : undefined
        };
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
        date: parsed.date,
        messageId: parsed.messageId,
        references: parsed.references
      };
    } finally {
      lock.release();
    }
  }

  static async deleteMessage(accountId: number, vaultKey: string, folder: string, uid: string): Promise<void> {
    const client = await ImapPool.getClient(accountId, vaultKey);
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageDelete(uid, { uid: true });
    } finally {
      lock.release();
    }
  }

  static async archiveMessage(accountId: number, vaultKey: string, folder: string, uid: string): Promise<void> {
    const client = await ImapPool.getClient(accountId, vaultKey);
    const lock = await client.getMailboxLock(folder);
    try {
      const folders = await client.list();
      const archiveFolder = folders.find(f => f.path.toLowerCase().includes('archive')) || 
                            folders.find(f => f.path.toLowerCase().includes('archivum'));
      
      if (!archiveFolder) {
        throw new Error('Archive folder not found');
      }

      await client.messageMove(uid, archiveFolder.path, { uid: true });
    } finally {
      lock.release();
    }
  }

  static async updateFlags(accountId: number, vaultKey: string, folder: string, uid: string, flags: string[], action: 'add' | 'remove' | 'set'): Promise<void> {
    const client = await ImapPool.getClient(accountId, vaultKey);
    const lock = await client.getMailboxLock(folder);
    try {
      if (action === 'add') {
        await client.messageFlagsAdd(uid, flags, { uid: true });
      } else if (action === 'remove') {
        await client.messageFlagsRemove(uid, flags, { uid: true });
      } else {
        await client.messageFlagsSet(uid, flags, { uid: true });
      }
    } finally {
      lock.release();
    }
  }

  static async sendMail(accountId: number, vaultKey: string, to: string, subject: string, body: string, inReplyTo?: string, references?: string | string[]): Promise<any> {
    const account = await db('accounts').where({ id: accountId }).first();
    if (!account) throw new Error('Account not found');

    const password = Vault.decrypt(account.encrypted_password, vaultKey);

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      auth: {
        user: account.email,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"${account.display_name || account.email}" <${account.email}>`,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>?/gm, ''),
      inReplyTo,
      references
    });

    return info;
  }
}
