import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Account Sidebar -->
    <aside class="account-sidebar">
      <div 
        *ngFor="let acc of accounts" 
        class="account-icon" 
        [class.active]="selectedAccount?.id === acc.id"
        (click)="selectAccount(acc)"
        (contextmenu)="onAccountContextMenu($event, acc)"
        [title]="acc.email"
      >
        {{ acc.email[0].toUpperCase() }}
      </div>
      
      <div class="account-icon add-btn" (click)="showAddModal = true" title="Connect New Account">
        <span class="material-symbols-outlined">add</span>
      </div>

      <div style="flex: 1"></div>

      <div class="account-icon" (click)="showSecurityModal = true" title="Master Security Settings">
        <span class="material-symbols-outlined">shield</span>
      </div>

      <div class="account-icon" (click)="logout()" title="Logout">
        <span class="material-symbols-outlined">logout</span>
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
      </div>
      <div class="compose-footer">
        <button class="milled-button primary-btn" [disabled]="sending" (click)="sendMail()">
          {{ sending ? 'TRANSMITTING...' : 'SEND' }}
        </button>
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
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; height: 100vh; width: 100vw; }
    .account-sidebar { width: 64px; background: #000; display: flex; flex-direction: column; align-items: center; padding-top: 20px; border-right: 1px solid var(--border-milled); z-index: 100; }
    .account-icon { width: 40px; height: 40px; border-radius: 8px; background: var(--bg-container); border: 1px solid var(--border-milled); margin-bottom: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: var(--text-secondary); font-weight: 700; font-size: 14px; }
    .account-icon.active { border-color: var(--accent-gold); color: var(--accent-gold); box-shadow: 0 0 10px var(--border-glow); }
    .account-icon.add-btn { border-style: dashed; opacity: 0.5; }
    .account-icon:hover { border-color: var(--accent-gold-muted); transform: scale(1.05); opacity: 1; }
    .folder-sidebar { width: 240px; background: var(--bg-sidebar); border-right: 1px solid var(--border-milled); display: flex; flex-direction: column; }
    .sidebar-header { padding: 24px; font-weight: 800; letter-spacing: 2px; color: var(--accent-gold); text-transform: uppercase; font-size: 12px; }
    .sidebar-actions { padding: 0 16px 24px 16px; }
    .compose-btn { width: 100%; padding: 14px; background: var(--bg-container); border-color: var(--accent-gold-muted); color: var(--accent-gold); font-size: 11px; letter-spacing: 2px; }
    .compose-btn:hover { background: var(--bg-hover); border-color: var(--accent-gold); }
    .sidebar-footer { padding: 16px; border-top: 1px solid var(--border-milled); }
    .nav-list { flex: 1; overflow-y: auto; }
    .nav-item { padding: 12px 24px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 13px; transition: all 0.2s; }
    .nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .nav-item.active { color: var(--accent-gold); border-right: 2px solid var(--accent-gold); background: linear-gradient(90deg, transparent, rgba(242, 202, 80, 0.05)); }
    .nav-item.loading { opacity: 0.5; cursor: default; }
    .nav-item.error-state { color: #f87171; }
    .inbox-list { width: 380px; border-right: 1px solid var(--border-milled); display: flex; flex-direction: column; background: rgba(15, 15, 15, 0.5); }
    .search-bar { padding: 16px; border-bottom: 1px solid var(--border-milled); }
    .search-input { width: 100%; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-milled); border-radius: 4px; padding: 10px 12px; color: var(--text-primary); font-size: 13px; outline: none; }
    .scroll-area { flex: 1; overflow-y: auto; }
    .email-item { padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); cursor: pointer; transition: all 0.2s; }
    .email-item:hover { background: rgba(255, 255, 255, 0.02); }
    .email-item.active { background: var(--bg-hover); border-left: 3px solid var(--accent-gold); }
    .email-item.unread { border-left: 3px solid var(--accent-gold); }
    .email-item.unread .email-sender { color: var(--text-primary); font-weight: 800; }
    .email-item.unread .email-subject { color: var(--text-primary); font-weight: 600; }
    .email-item.error { color: #f87171; text-align: center; font-size: 11px; }
    .email-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .email-sender { font-weight: 600; font-size: 13px; color: var(--text-secondary); }
    .email-time { font-size: 11px; color: var(--text-muted); }
    .email-subject { font-size: 13px; color: var(--accent-gold-muted); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .email-preview { font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .message-view { flex: 1; display: flex; flex-direction: column; background: var(--bg-main); overflow: hidden; }
    .message-toolbar { height: 48px; border-bottom: 1px solid var(--border-milled); display: flex; align-items: center; padding: 0 16px; gap: 8px; background: rgba(0,0,0,0.2); }
    .tool-group { display: flex; align-items: center; gap: 4px; }
    .tool-divider { width: 1px; height: 20px; background: var(--border-milled); margin: 0 8px; }
    .tool-btn { background: transparent; border: none; color: var(--text-secondary); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; }
    .tool-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .tool-btn .material-symbols-outlined { font-size: 20px; }
    .tool-btn.mini { width: 28px; height: 28px; }
    .tool-btn.mini .material-symbols-outlined { font-size: 18px; }
    .message-content-scroll { flex: 1; overflow-y: auto; }
    .message-header-v2 { padding: 24px 32px; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .subject-line { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .subject-line h1 { font-size: 22px; font-weight: 400; color: var(--text-primary); font-family: 'Inter', sans-serif; flex: 1; }
    .icon-label { color: var(--text-muted); font-size: 20px; }
    .folder-tag { background: #3c4043; color: #e8eaed; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
    .sender-info-v2 { display: flex; gap: 12px; align-items: flex-start; }
    .sender-avatar-v2 { width: 40px; height: 40px; border-radius: 50%; background: #5c6bc0; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
    .meta-body { flex: 1; }
    .meta-row-1 { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .sender-name { font-weight: 700; font-size: 14px; }
    .sender-email { color: var(--text-secondary); font-size: 12px; }
    .message-date { font-size: 12px; color: var(--text-secondary); margin-right: 12px; }
    .meta-actions { display: flex; gap: 4px; }
    .meta-row-2 { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary); }
    .message-body-v2 { padding: 32px; max-width: 900px; }
    .html-content-v2 { background: #fff; color: #000; padding: 24px; border-radius: 8px; min-height: 200px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .reply-placeholder { margin-top: 32px; display: flex; gap: 12px; }
    .compose-modal { position: fixed; bottom: 0; right: 80px; width: 500px; height: 600px; background: #1a1a1a; border: 1px solid var(--border-milled); border-radius: 12px 12px 0 0; z-index: 2000; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,0,0,0.8); }
    .compose-header { padding: 12px 16px; background: #000; border-radius: 12px 12px 0 0; display: flex; align-items: center; font-size: 13px; font-weight: 700; color: var(--accent-gold); letter-spacing: 1px; }
    .compose-body { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .compose-row { border-bottom: 1px solid rgba(255,255,255,0.05); }
    .compose-row input { width: 100%; background: transparent; border: none; padding: 12px 0; color: #fff; outline: none; }
    .compose-body textarea { flex: 1; background: transparent; border: none; color: #fff; outline: none; resize: none; font-size: 14px; line-height: 1.6; padding-top: 16px; }
    .compose-footer { padding: 16px; display: flex; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); }
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal { width: 500px; padding: 32px; }
    .modal h2 { margin-bottom: 24px; color: var(--accent-gold); font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
    .form-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .input-group { flex: 1; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .input-group label { font-size: 10px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 1px; }
    .modal input { background: rgba(0,0,0,0.3); border: 1px solid var(--border-milled); border-radius: 4px; padding: 10px; color: #fff; outline: none; }
    .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
    .primary-btn { background: var(--accent-gold); color: #000; border: none; }
    .detail-empty { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; flex-direction: column; }
  `]
})
export class DashboardComponent implements OnInit {
  accounts: any[] = [];
  selectedAccount: any = null;
  folders: any[] = [];
  selectedFolder: string = 'INBOX';
  messages: any[] = [];
  selectedMessage: any = null;
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
  showCompose = false;
  sending = false;
  composeData = { to: '', subject: '', body: '' };

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() { this.loadAccounts(); }

  getHeaders() {
    const token = localStorage.getItem('webmail_token');
    return new HttpHeaders().set('Authorization', 'Bearer ' + token);
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

  openCompose() {
    this.composeData = { to: '', subject: '', body: '' };
    this.showCompose = true;
    this.cdr.detectChanges();
  }

  reply() {
    this.composeData = {
      to: this.selectedMessage.envelope.from[0].address,
      subject: 'Re: ' + this.selectedMessage.envelope.subject,
      body: '\\n\\n--- Original Message ---\\n' + this.selectedMessage.envelope.from[0].address + ' wrote:\\n'
    };
    this.showCompose = true;
    this.cdr.detectChanges();
  }

  forward() {
    this.composeData = {
      to: '',
      subject: 'Fwd: ' + this.selectedMessage.envelope.subject,
      body: '\\n\\n--- Forwarded Message ---\\nSubject: ' + this.selectedMessage.envelope.subject + '\\n'
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
    const vaultKey = sessionStorage.getItem('vault_key');
    this.http.get<any>(\`/api/mail/body?accountId=\${this.selectedAccount.id}&vaultKey=\${vaultKey}&folder=\${this.selectedFolder}&uid=\${uid}\`, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
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
    this.http.get<any[]>('/api/mail/messages?accountId=' + accountId + '&vaultKey=' + vaultKey + '&folder=' + folder, { headers: this.getHeaders() })
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
