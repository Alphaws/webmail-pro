import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import CryptoJS from 'crypto-js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Account Sidebar -->
    <aside class="account-sidebar">
      <div 
        *ngFor="let acc of accounts" 
        class="account-item" 
        [class.active]="selectedAccount?.id === acc.id"
        (click)="selectAccount(acc)"
        (contextmenu)="onAccountContextMenu($event, acc)"
      >
        <div class="account-icon-container">
          <img [src]="getGravatarUrl(acc.email)" class="account-gravatar" alt="Avatar">
        </div>
        <span class="account-full-email">{{ acc.email }}</span>
      </div>
      
      <div class="account-item add-btn" (click)="showAddModal = true">
        <div class="account-icon-container">
          <span class="material-symbols-outlined">add</span>
        </div>
        <span class="account-full-email">Connect Identity</span>
      </div>

      <div style="flex: 1"></div>

      <div class="account-item" (click)="showSecurityModal = true">
        <div class="account-icon-container">
          <span class="material-symbols-outlined">shield</span>
        </div>
        <span class="account-full-email">Security</span>
      </div>

      <div class="account-item" (click)="logout()">
        <div class="account-icon-container">
          <span class="material-symbols-outlined">logout</span>
        </div>
        <span class="account-full-email">Logout</span>
      </div>
    </aside>

    <!-- Folder Sidebar -->
    <aside class="folder-sidebar">
      <div class="sidebar-header">Intelligence v1.1</div>
      
      <div class="sidebar-actions">
        <button class="compose-btn milled-button" (click)="openCompose()">
          <span class="material-symbols-outlined">edit</span> COMPOSE
        </button>
      </div>

      <nav class="nav-list">
        <div 
          *ngFor="let folder of folders" 
          class="nav-item" 
          [class.active]="selectedFolder === folder.path"
          (click)="selectFolder(folder)"
        >
          <span class="material-symbols-outlined">{{ getFolderIcon(folder.path) }}</span>
          {{ folder.path }}
        </div>
        <div *ngIf="loadingFolders" class="nav-item loading">Syncing...</div>
        <div *ngIf="syncError" class="nav-item error-state" (click)="loadFolders(selectedAccount.id)">
          <span class="material-symbols-outlined">warning</span> Sync Failed
        </div>
      </nav>

      <div class="sidebar-footer" *ngIf="selectedAccount">
        <button class="milled-button" style="width: 100%; border: none;" (click)="editAccount(selectedAccount)">
          <span class="material-symbols-outlined">settings</span> Config
        </button>
      </div>
    </aside>

    <!-- Inbox / Message List -->
    <section class="inbox-list">
      <div class="search-bar">
        <input type="text" class="search-input" placeholder="Search transmissions...">
      </div>

      <div class="scroll-area">
        <div 
          *ngFor="let msg of messages" 
          class="email-item"
          [class.active]="selectedMessage?.uid === msg.uid"
          [class.unread]="!hasFlag(msg, '\\\\Seen')"
          (click)="selectMessage(msg)"
        >
          <div class="email-header">
            <span class="email-sender">{{ msg.envelope.from[0].name || msg.envelope.from[0].address }}</span>
            <span class="email-time">{{ msg.envelope.date | date:'HH:mm' }}</span>
          </div>
          <div class="email-subject">{{ msg.envelope.subject }}</div>
          <div class="email-preview">Sector telemetry data stream...</div>
        </div>
        
        <div *ngIf="loadingMessages" class="email-item loading">Fetching telemetry...</div>
        <div *ngIf="syncError" class="email-item error">Authentication Failed</div>
        <div *ngIf="!loadingMessages && !syncError && messages.length === 0" class="email-item empty">No data in this sector.</div>
      </div>
    </section>

    <!-- Message Detail -->
    <main class="message-view">
      <ng-container *ngIf="selectedMessage">
        <!-- GMAIL-LIKE TOOLBAR -->
        <div class="message-toolbar">
          <div class="tool-group">
            <button class="tool-btn" title="Archive" (click)="archiveMessage(selectedMessage.uid)"><span class="material-symbols-outlined">archive</span></button>
            <button class="tool-btn" title="Report Spam"><span class="material-symbols-outlined">report</span></button>
            <button class="tool-btn" title="Delete" (click)="deleteMessage(selectedMessage.uid)"><span class="material-symbols-outlined">delete</span></button>
          </div>
          <div class="tool-divider"></div>
          <div class="tool-group">
            <button class="tool-btn" [title]="hasFlag(selectedMessage, '\\\\Seen') ? 'Mark as unread' : 'Mark as read'" (click)="toggleSeen(selectedMessage.uid, !hasFlag(selectedMessage, '\\\\Seen'))">
              <span class="material-symbols-outlined">{{ hasFlag(selectedMessage, '\\\\Seen') ? 'mark_as_unread' : 'drafts' }}</span>
            </button>
            <button class="tool-btn" title="Move to"><span class="material-symbols-outlined">drive_file_move</span></button>
            <button class="tool-btn" title="Labels"><span class="material-symbols-outlined">label</span></button>
          </div>
          <div style="flex: 1"></div>
          <div class="tool-group">
            <button class="tool-btn" (click)="prevMessage()"><span class="material-symbols-outlined">chevron_left</span></button>
            <button class="tool-btn" (click)="nextMessage()"><span class="material-symbols-outlined">chevron_right</span></button>
          </div>
        </div>

        <div class="message-content-scroll">
          <header class="message-header-v2">
            <div class="subject-line">
              <h1 class="message-subject">{{ selectedMessage.envelope.subject }}</h1>
              <span class="material-symbols-outlined icon-label">label_important</span>
              <span class="folder-tag">{{ selectedFolder }}</span>
            </div>
            
            <div class="sender-info-v2">
              <div class="sender-avatar-v2">{{ selectedMessage.envelope.from[0].address[0].toUpperCase() }}</div>
              <div class="meta-body">
                <div class="meta-row-1">
                  <div class="sender-name-group">
                    <span class="sender-name">{{ selectedMessage.envelope.from[0].name || selectedMessage.envelope.from[0].address }}</span>
                    <span class="sender-email">&lt;{{ selectedMessage.envelope.from[0].address }}&gt;</span>
                  </div>
                  <div style="flex: 1"></div>
                  <span class="message-date">{{ selectedMessage.envelope.date | date:'MMM d, y, h:mm a' }}</span>
                  <div class="meta-actions">
                    <button class="tool-btn mini"><span class="material-symbols-outlined">star</span></button>
                    <button class="tool-btn mini" (click)="reply()"><span class="material-symbols-outlined">reply</span></button>
                    <button class="tool-btn mini"><span class="material-symbols-outlined">more_vert</span></button>
                  </div>
                </div>
                <div class="meta-row-2">
                  <span class="to-label">to me</span>
                  <span class="material-symbols-outlined" style="font-size: 14px; cursor: pointer;">arrow_drop_down</span>
                </div>
              </div>
            </div>
          </header>
          
          <article class="message-body-v2" *ngIf="!loadingBody">
            <div [innerHTML]="safeBody" class="html-content-v2"></div>
            
            <div class="attachments-section" *ngIf="selectedMessageBody?.attachments?.length > 0">
              <div class="attachments-header">
                <span class="material-symbols-outlined">attach_file</span>
                {{ selectedMessageBody.attachments.length }} Attachments
              </div>
              <div class="attachments-grid">
                <div class="attachment-card" *ngFor="let att of selectedMessageBody.attachments" (click)="downloadAttachment(att)">
                  <span class="material-symbols-outlined attachment-icon">draft</span>
                  <div class="attachment-info">
                    <span class="attachment-name">{{ att.filename }}</span>
                    <span class="attachment-size">{{ att.size | number }} bytes</span>
                  </div>
                  <button class="attachment-download">
                    <span class="material-symbols-outlined">download</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="reply-placeholder">
              <button class="milled-button" (click)="reply()"><span class="material-symbols-outlined">reply</span> Reply</button>
              <button class="milled-button" style="margin-left: 12px;" (click)="forward()"><span class="material-symbols-outlined">forward</span> Forward</button>
            </div>
          </article>

          <div class="body-loading" *ngIf="loadingBody">
            <div class="milled-container" style="padding: 20px;">Decrypting transmission...</div>
          </div>
        </div>
      </ng-container>

      <div class="detail-empty" *ngIf="!selectedMessage && !syncError">
        <div class="milled-container" style="padding: 40px; text-align: center; opacity: 0.5;">
          <span class="material-symbols-outlined" style="font-size: 64px; color: var(--accent-gold);">data_usage</span>
          <p style="margin-top: 16px; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">Select transmission to decrypt</p>
        </div>
      </div>

      <div class="detail-empty" *ngIf="syncError">
        <div class="milled-container" style="padding: 40px; text-align: center; border-color: #f87171;">
          <span class="material-symbols-outlined" style="font-size: 64px; color: #f87171;">lock_person</span>
          <h3 style="color: #f87171; margin-top: 16px;">AUTHENTICATION FAILED</h3>
          <p style="margin-top: 16px; color: var(--text-secondary); font-size: 13px;">
            The credentials for this sector are invalid or expired.<br>
            Please update the access key in Config.
          </p>
          <button class="milled-button" style="margin-top: 24px;" (click)="editAccount(selectedAccount)">
            <span class="material-symbols-outlined">settings</span> Update Config
          </button>
        </div>
      </div>
    </main>

    <!-- Compose Modal -->
    <div class="compose-modal milled-container" *ngIf="showCompose">
      <div class="compose-header">
        <span>New Transmission</span>
        <div style="flex: 1"></div>
        <button class="tool-btn" (click)="showCompose = false"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="compose-body">
        <div class="compose-row">
          <input type="text" [(ngModel)]="composeData.to" placeholder="Recipients">
        </div>
        <div class="compose-row">
          <input type="text" [(ngModel)]="composeData.subject" placeholder="Subject">
        </div>
        <textarea [(ngModel)]="composeData.body" placeholder="Establish connection message..."></textarea>
        
        <div class="compose-attachments" *ngIf="composeData.attachments.length > 0">
          <div class="attachment-pill" *ngFor="let att of composeData.attachments; let i = index">
            <span class="material-symbols-outlined">attach_file</span>
            <span class="pill-name">{{ att.filename }}</span>
            <span class="pill-remove" (click)="removeAttachment(i)">&times;</span>
          </div>
        </div>
      </div>
      <div class="compose-footer">
        <button class="milled-button primary-btn" [disabled]="sending" (click)="sendMail()">
          {{ sending ? 'TRANSMITTING...' : 'SEND' }}
        </button>
        <button class="tool-btn" style="margin-left: 8px;" (click)="fileInput.click()" title="Attach File">
          <span class="material-symbols-outlined">attach_file</span>
        </button>
        <input type="file" #fileInput style="display: none" (change)="handleFileUpload($event)" multiple>
        <div style="flex: 1"></div>
        <button class="tool-btn" (click)="showCompose = false"><span class="material-symbols-outlined">delete</span></button>
      </div>
    </div>

    <!-- Account Modal -->
    <div class="modal-overlay" *ngIf="showAddModal || editingAcc">
      <div class="modal milled-container">
        <h2>{{ editingAcc ? 'Update' : 'Connect' }} Identity</h2>
        <form (submit)="saveAccount()">
          <div class="form-row">
            <div class="input-group">
              <label>Email Address</label>
              <input type="email" name="acc_email" [(ngModel)]="accForm.email" placeholder="hello@vane.hu" required>
            </div>
            <div class="input-group">
              <label>Display Name</label>
              <input type="text" name="acc_display" [(ngModel)]="accForm.display_name" placeholder="John Doe">
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label>IMAP Host</label>
              <input type="text" name="acc_imap" [(ngModel)]="accForm.imap_host" placeholder="mail.vane.hu" required>
            </div>
            <div class="input-group" style="width: 80px;">
              <label>Port</label>
              <input type="number" name="acc_imap_port" [(ngModel)]="accForm.imap_port">
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label>SMTP Host</label>
              <input type="text" name="acc_smtp" [(ngModel)]="accForm.smtp_host" placeholder="mail.vane.hu" required>
            </div>
            <div class="input-group" style="width: 80px;">
              <label>Port</label>
              <input type="number" name="acc_smtp_port" [(ngModel)]="accForm.smtp_port">
            </div>
          </div>

          <div class="input-group">
            <label>Mail Password</label>
            <input type="password" name="acc_pass" [(ngModel)]="accForm.password" [placeholder]="editingAcc ? 'Leave blank to keep' : '••••••••'">
          </div>

          <div class="modal-actions">
            <button type="button" class="milled-button" style="border: none; color: #f87171;" *ngIf="editingAcc" (click)="deleteAccount()">
              <span class="material-symbols-outlined">delete</span> Delete
            </button>
            <div style="flex: 1"></div>
            <button type="button" class="milled-button" (click)="closeModal()">Cancel</button>
            <button type="submit" class="milled-button primary-btn">
              <span class="material-symbols-outlined">check</span> {{ editingAcc ? 'Update' : 'Establish' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Security Modal (Change Master Password) -->
    <div class="modal-overlay" *ngIf="showSecurityModal">
      <div class="modal milled-container">
        <h2>Master Security</h2>
        <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 24px;">Updating your Master Key will re-encrypt all stored transmissions.</p>
        
        <form (submit)="changeMasterPassword()">
          <div class="input-group">
            <label>Current Master Key</label>
            <input type="password" name="old_master" [(ngModel)]="securityForm.oldPassword" required>
          </div>
          <div class="input-group">
            <label>New Master Key</label>
            <input type="password" name="new_master" [(ngModel)]="securityForm.newPassword" required>
          </div>
          <div class="input-group">
            <label>Confirm New Key</label>
            <input type="password" name="new_master_confirm" [(ngModel)]="securityForm.confirmPassword" required>
          </div>

          <p class="error-msg" style="color: #f87171; font-size: 12px; margin-bottom: 16px;" *ngIf="securityError">{{ securityError }}</p>

          <div class="modal-actions">
            <div style="flex: 1"></div>
            <button type="button" class="milled-button" (click)="showSecurityModal = false">Cancel</button>
            <button type="submit" class="milled-button primary-btn" [disabled]="securityLoading">
              {{ securityLoading ? 'Re-keying...' : 'Update Master Key' }}
            </button>
          </div>
        </form>

        <div class="recovery-section" style="margin-top: 40px; padding-top: 24px; border-top: 1px dashed var(--border-milled);">
          <h3 style="font-size: 14px; color: var(--accent-gold); margin-bottom: 8px;">Emergency Recovery</h3>
          <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 16px;">Generate a 24-word recovery phrase to access your transmissions if you forget your Master Key.</p>
          
          <button class="milled-button" (click)="generateRecovery()" *ngIf="!recoveryMnemonic" [disabled]="securityLoading">
            <span class="material-symbols-outlined">key</span> Generate Recovery Phrase
          </button>

          <div class="mnemonic-display" *ngIf="recoveryMnemonic">
            <p style="color: #f87171; font-weight: 700; margin-bottom: 12px; font-size: 11px;">SAVE THIS SECURELY. IT WILL NOT BE SHOWN AGAIN.</p>
            <div class="mnemonic-grid">
              <div class="mnemonic-word" *ngFor="let word of recoveryMnemonic.split(' '); let i = index">
                <span class="word-num">{{ i + 1 }}</span> {{ word }}
              </div>
            </div>
            <button class="milled-button" style="margin-top: 16px;" (click)="recoveryMnemonic = ''">I have saved it</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  accounts: any[] = [];
  selectedAccount: any = null;
  folders: any[] = [];
  selectedFolder: string = 'INBOX';
  messages: any[] = [];
  selectedMessage: any = null;
  selectedMessageBody: any = null;
  safeBody: SafeHtml = '';
  loadingFolders = false;
  loadingMessages = false;
  loadingBody = false;
  syncError = false;
  showAddModal = false;
  editingAcc: any = null;
  accForm: any = { email: '', display_name: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, password: '' };
  showSecurityModal = false;
  securityLoading = false;
  securityError = '';
  securityForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  recoveryMnemonic = '';
  showCompose = false;
  sending = false;
  composeData: any = { to: '', subject: '', body: '', inReplyTo: undefined, references: undefined, attachments: [] };

  private socket: Socket | null = null;

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() { 
    this.loadAccounts();
    this.initSocket();
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }

  initSocket() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      if (this.selectedAccount) {
        this.socket?.emit('join-account', this.selectedAccount.id);
      }
    });

    this.socket.on('mailbox-update', (data: any) => {
      console.log('IMAP PUSH: Mailbox update', data);
      if (this.selectedAccount && this.selectedFolder === data.folder) {
        this.loadMessages(this.selectedAccount.id, this.selectedFolder);
      }
    });

    this.socket.on('message-update', (data: any) => {
      console.log('IMAP PUSH: Message update', data);
      const msg = this.messages.find(m => m.uid === data.uid);
      if (msg) {
        msg.flags = data.flags;
        this.cdr.detectChanges();
      }
    });
  }

  getHeaders() {
    const token = localStorage.getItem('webmail_token');
    return new HttpHeaders().set('Authorization', 'Bearer ' + token);
  }

  getGravatarUrl(email: string): string {
    const hash = CryptoJS.MD5(email.trim().toLowerCase()).toString();
    return `https://www.gravatar.com/avatar/${hash}?s=80&d=identicon`;
  }

  handleFileUpload(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const content = e.target.result.split(',')[1];
        this.composeData.attachments.push({
          filename: file.name,
          content: content,
          size: file.size
        });
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeAttachment(idx: number) {
    this.composeData.attachments.splice(idx, 1);
    this.cdr.detectChanges();
  }

  loadAccounts() {
    this.http.get<any[]>('/api/accounts', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.accounts = data;
          if (this.accounts.length > 0 && !this.selectedAccount) {
            this.selectAccount(this.accounts[0]);
          }
          this.cdr.detectChanges();
        },
        error: () => this.router.navigate(['/login'])
      });
  }

  selectAccount(account: any) {
    this.selectedAccount = account;
    this.selectedMessage = null;
    this.syncError = false;
    this.loadFolders(account.id);
    if (this.socket) {
      this.socket.emit('join-account', account.id);
    }
    this.cdr.detectChanges();
  }

  selectFolder(folder: any) {
    this.selectedFolder = folder.path;
    this.selectedMessage = null;
    this.loadMessages(this.selectedAccount.id, folder.path);
    this.cdr.detectChanges();
  }

  selectMessage(msg: any) {
    this.selectedMessage = msg;
    this.loadMessageBody(msg.uid);
    if (!this.hasFlag(msg, '\\\\Seen')) {
      this.toggleSeen(msg.uid, true);
    }
    this.cdr.detectChanges();
  }

  prevMessage() {
    const idx = this.messages.findIndex(m => m.uid === this.selectedMessage.uid);
    if (idx > 0) this.selectMessage(this.messages[idx - 1]);
  }

  nextMessage() {
    const idx = this.messages.findIndex(m => m.uid === this.selectedMessage.uid);
    if (idx < this.messages.length - 1) this.selectMessage(this.messages[idx + 1]);
  }

  editAccount(acc: any) {
    this.editingAcc = acc;
    this.accForm = { ...acc, password: '' };
    this.showAddModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showAddModal = false;
    this.editingAcc = null;
    this.accForm = { email: '', display_name: '', imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 587, password: '' };
    this.cdr.detectChanges();
  }

  saveAccount() {
    const vaultKey = sessionStorage.getItem('vault_key');
    const payload = { ...this.accForm, vault_key: vaultKey };
    if (this.editingAcc) {
      this.http.put('/api/accounts/' + this.editingAcc.id, payload, { headers: this.getHeaders() }).subscribe(() => {
        this.loadAccounts();
        this.closeModal();
      });
    } else {
      this.http.post('/api/accounts', payload, { headers: this.getHeaders() }).subscribe(() => {
        this.loadAccounts();
        this.closeModal();
      });
    }
  }

  deleteAccount() {
    if (confirm('Permanently disconnect this identity?')) {
      this.http.delete('/api/accounts/' + this.editingAcc.id, { headers: this.getHeaders() }).subscribe(() => {
        this.selectedAccount = null;
        this.loadAccounts();
        this.closeModal();
      });
    }
  }

  changeMasterPassword() {
    if (this.securityForm.newPassword !== this.securityForm.confirmPassword) {
      this.securityError = 'New passwords do not match';
      return;
    }
    this.securityLoading = true;
    this.securityError = '';
    this.http.post<any>('/api/auth/change-password', {
      oldPassword: this.securityForm.oldPassword,
      newPassword: this.securityForm.newPassword
    }, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        sessionStorage.setItem('vault_key', res.newVaultKey);
        this.showSecurityModal = false;
        this.securityLoading = false;
        this.securityForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
        alert('Master Key updated successfully. Vault has been re-keyed.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.securityError = err.error.message || 'Failed to update key';
        this.securityLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateRecovery() {
    this.securityLoading = true;
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.post<any>('/api/auth/generate-recovery', { vaultKey }, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.recoveryMnemonic = res.mnemonic;
          this.securityLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          alert('Failed to generate recovery: ' + (err.error?.message || 'Unknown error'));
          this.securityLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  openCompose() {
    this.composeData = { to: '', subject: '', body: '', inReplyTo: undefined, references: undefined, attachments: [] };
    this.showCompose = true;
    this.cdr.detectChanges();
  }

  reply() {
    if (!this.selectedMessage || !this.selectedMessageBody) return;
    const body = this.selectedMessageBody.text || '';
    const quoted = body.split('\\n').map((line: string) => '> ' + line).join('\\n');
    this.composeData = {
      to: this.selectedMessage.envelope.from[0].address,
      subject: 'Re: ' + this.selectedMessage.envelope.subject,
      body: '\\n\\nOn ' + new Date(this.selectedMessage.envelope.date).toLocaleString() + ', ' + this.selectedMessage.envelope.from[0].address + ' wrote:\\n' + quoted,
      inReplyTo: this.selectedMessageBody.messageId,
      references: (this.selectedMessageBody.references || []).concat(this.selectedMessageBody.messageId),
      attachments: []
    };
    this.showCompose = true;
    this.cdr.detectChanges();
  }

  forward() {
    if (!this.selectedMessage || !this.selectedMessageBody) return;
    const body = this.selectedMessageBody.text || '';
    this.composeData = {
      to: '',
      subject: 'Fwd: ' + this.selectedMessage.envelope.subject,
      body: '\\n\\n--- Forwarded Message ---\\nFrom: ' + this.selectedMessage.envelope.from[0].address + '\\nDate: ' + new Date(this.selectedMessage.envelope.date).toLocaleString() + '\\nSubject: ' + this.selectedMessage.envelope.subject + '\\n\\n' + body,
      inReplyTo: undefined,
      references: undefined,
      attachments: []
    };
    this.showCompose = true;
    this.cdr.detectChanges();
  }

  sendMail() {
    if (!this.composeData.to) return;
    this.sending = true;
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.post('/api/mail/send', {
      accountId: this.selectedAccount.id,
      vaultKey,
      ...this.composeData
    }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.sending = false;
        this.showCompose = false;
        alert('Transmission sent successfully.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.sending = false;
        alert('Transmission failed: ' + (err.error.message || 'Unknown error'));
        this.cdr.detectChanges();
      }
    });
  }

  hasFlag(msg: any, flag: string): boolean {
    if (!msg || !msg.flags) return false;
    return Array.isArray(msg.flags) && msg.flags.includes(flag);
  }

  deleteMessage(uid: string) {
    if (!confirm('Move transmission to trash?')) return;
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.post('/api/mail/delete', {
      accountId: this.selectedAccount.id,
      vaultKey,
      folder: this.selectedFolder,
      uid
    }, { headers: this.getHeaders() }).subscribe(() => {
      this.selectedMessage = null;
      this.loadMessages(this.selectedAccount.id, this.selectedFolder);
    });
  }

  archiveMessage(uid: string) {
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.post('/api/mail/archive', {
      accountId: this.selectedAccount.id,
      vaultKey,
      folder: this.selectedFolder,
      uid
    }, { headers: this.getHeaders() }).subscribe(() => {
      this.selectedMessage = null;
      this.loadMessages(this.selectedAccount.id, this.selectedFolder);
    });
  }

  toggleSeen(uid: string, seen: boolean) {
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.post('/api/mail/toggle-seen', {
      accountId: this.selectedAccount.id,
      vaultKey,
      folder: this.selectedFolder,
      uid,
      seen
    }, { headers: this.getHeaders() }).subscribe(() => {
      const msg = this.messages.find(m => m.uid === uid);
      if (msg) {
        if (!msg.flags) msg.flags = [];
        if (seen && !msg.flags.includes('\\\\Seen')) msg.flags.push('\\\\Seen');
        if (!seen) msg.flags = msg.flags.filter((f: string) => f !== '\\\\Seen');
      }
      this.cdr.detectChanges();
    });
  }

  onAccountContextMenu(event: MouseEvent, acc: any) {
    event.preventDefault();
    this.editAccount(acc);
  }

  loadMessageBody(uid: string) {
    this.loadingBody = true;
    this.safeBody = '';
    this.selectedMessageBody = null;
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.get<any>(`/api/mail/body?accountId=${this.selectedAccount.id}&vaultKey=${vaultKey}&folder=${this.selectedFolder}&uid=${uid}`, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.selectedMessageBody = data;
          this.safeBody = this.sanitizer.bypassSecurityTrustHtml(data.html || data.text);
          this.loadingBody = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingBody = false;
          this.cdr.detectChanges();
        }
      });
  }

  downloadAttachment(att: any) {
    const vaultKey = sessionStorage.getItem('vault_key');
    const url = `/api/mail/attachment?accountId=${this.selectedAccount.id}&vaultKey=${vaultKey}&folder=${this.selectedFolder}&uid=${this.selectedMessage.uid}&filename=${encodeURIComponent(att.filename)}&checksum=${att.checksum}`;
    
    this.http.get(url, { headers: this.getHeaders(), responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = att.filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: (err) => {
        alert('Failed to download attachment: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }

  getFolderIcon(path: string): string {
    const p = path.toLowerCase();
    if (p.includes('inbox')) return 'inbox';
    if (p.includes('sent')) return 'send';
    if (p.includes('draft')) return 'draft';
    if (p.includes('trash')) return 'delete';
    if (p.includes('spam')) return 'report';
    return 'folder';
  }

  loadFolders(accountId: number) {
    this.loadingFolders = true;
    this.syncError = false;
    this.folders = [];
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.get<any[]>('/api/mail/folders?accountId=' + accountId + '&vaultKey=' + vaultKey, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.folders = data;
          this.loadingFolders = false;
          if (this.folders.length > 0) {
            const inbox = this.folders.find(f => f.path.toLowerCase().includes('inbox')) || this.folders[0];
            this.selectedFolder = inbox.path;
            this.loadMessages(accountId, inbox.path);
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loadingFolders = false;
          if (err.status === 401) this.syncError = true;
          this.cdr.detectChanges();
        }
      });
  }

  loadMessages(accountId: number, folder: string) {
    this.loadingMessages = true;
    this.messages = [];
    const vaultKey = sessionStorage.getItem('vault_key');
    const token = this.getHeaders();
    
    // 1. Fetch cached messages
    this.http.get<any[]>(`/api/mail/messages?accountId=${accountId}&vaultKey=${vaultKey}&folder=${folder}&cached=true`, { headers: token })
      .subscribe({
        next: (data) => {
          if (this.messages.length === 0) { // Only update if IMAP sync hasn't finished already
            this.messages = data;
            this.cdr.detectChanges();
          }
        }
      });

    // 2. Perform sync
    this.http.get<any[]>(`/api/mail/messages?accountId=${accountId}&vaultKey=${vaultKey}&folder=${folder}`, { headers: token })
      .subscribe({
        next: (data) => {
          this.messages = data;
          this.loadingMessages = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loadingMessages = false;
          if (err.status === 401) this.syncError = true;
          this.cdr.detectChanges();
        }
      });
  }

  logout() {
    localStorage.removeItem('webmail_token');
    sessionStorage.removeItem('vault_key');
    this.router.navigate(['/login']);
  }
}
