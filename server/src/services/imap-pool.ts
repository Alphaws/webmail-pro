import { ImapFlow } from 'imapflow';
import { Vault } from '../utils/vault';
import db from '../database/db';
import { SocketService } from './socket';

export class ImapPool {
  private static connections: Map<number, ImapFlow> = new Map();

  static async getClient(accountId: number, vaultKey: string): Promise<ImapFlow> {
    // Return existing active connection if available
    if (this.connections.has(accountId)) {
      const existingClient = this.connections.get(accountId)!;
      if (existingClient.usable) {
        return existingClient;
      }
      // If not usable, cleanup and create new
      try { await existingClient.logout(); } catch (e) {}
      this.connections.delete(accountId);
    }

    const account = await db('accounts').where({ id: accountId }).first();
    if (!account) throw new Error('Account not found');

    const password = Vault.decrypt(account.encrypted_password, vaultKey);

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port,
      secure: account.imap_secure,
      auth: {
        user: account.email,
        pass: password
      },
      logger: false,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    await client.connect();
    
    // Setup IDLE on INBOX by default
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Just opening it is enough to start receiving events if the server supports it
      // and we stay connected.
    } finally {
      lock.release();
    }

    // Store connection in pool
    this.connections.set(accountId, client);

    // Auto-cleanup on close
    client.on('close', () => {
      this.connections.delete(accountId);
    });

    // Handle IMAP events
    client.on('exists', (data) => {
      console.log(`IMAP EVENT [Account ${accountId}]: New messages exist (${data.count})`);
      SocketService.emitToAccount(accountId, 'mailbox-update', { type: 'exists', count: data.count, folder: 'INBOX' });
    });

    client.on('flags', (data) => {
      SocketService.emitToAccount(accountId, 'message-update', { type: 'flags', uid: data.uid, flags: Array.from(data.flags || []), folder: 'INBOX' });
    });

    return client;
  }

  /**
   * Optional: Clear all connections (e.g. on server restart or user logout)
   */
  static async clear() {
    for (const [id, client] of this.connections) {
      try { await client.logout(); } catch (e) {}
    }
    this.connections.clear();
  }
}
