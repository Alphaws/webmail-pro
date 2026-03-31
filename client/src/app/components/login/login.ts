import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card milled-container">
        <div class="brand">
          <span class="material-symbols-outlined icon-main">mail</span>
          <h1>Webmail<span>Pro</span></h1>
        </div>
        <p class="subtitle">Concurrent Intelligence Platform</p>
        
        <form (submit)="onLogin()" *ngIf="!isRecovering">
          <div class="input-group">
            <label for="username">Operator Identity</label>
            <input type="text" id="username" name="username" [(ngModel)]="username" placeholder="Username" required>
          </div>
          <div class="input-group">
            <label for="password">Master Access Key</label>
            <input type="password" id="password" name="password" [(ngModel)]="password" placeholder="••••••••" required>
          </div>
          
          <button type="submit" class="milled-button login-btn" [disabled]="loading">
            {{ loading ? 'Authenticating...' : 'Establish Session' }}
          </button>
          
          <p class="error-msg" *ngIf="error">{{ error }}</p>

          <p style="margin-top: 24px; font-size: 11px; color: var(--text-secondary); cursor: pointer;" (click)="isRecovering = true">
            Forgot Master Key? Use Recovery Phrase
          </p>
        </form>

        <form (submit)="onRecover()" *ngIf="isRecovering">
          <div class="input-group">
            <label for="rec-username">Operator Identity</label>
            <input type="text" id="rec-username" name="username" [(ngModel)]="username" placeholder="Username" required>
          </div>
          <div class="input-group">
            <label for="phrase">24-Word Recovery Phrase</label>
            <textarea id="phrase" name="phrase" [(ngModel)]="recoveryPhrase" placeholder="word1 word2 ... word24" required style="width: 100%; height: 80px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-milled); border-radius: 4px; color: #fff; padding: 12px; outline: none;"></textarea>
          </div>
          <div class="input-group">
            <label for="new-pass">New Master Access Key</label>
            <input type="password" id="new-pass" name="new_pass" [(ngModel)]="password" placeholder="••••••••" required>
          </div>
          
          <button type="submit" class="milled-button login-btn" [disabled]="loading">
            {{ loading ? 'Recovering...' : 'Restore Access' }}
          </button>
          
          <p class="error-msg" *ngIf="error">{{ error }}</p>

          <p style="margin-top: 24px; font-size: 11px; color: var(--text-secondary); cursor: pointer;" (click)="isRecovering = false">
            Back to Login
          </p>
        </form>
        
        <div class="footer-meta">
          <span>v1.0.263-stable</span>
          <span class="status-dot"></span>
          <span>System Ready</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      height: 100vh;
      width: 100vw;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%);
    }
    .login-card {
      width: 400px;
      padding: 48px;
      text-align: center;
    }
    .brand h1 {
      font-size: 28px;
      margin-top: 16px;
      color: var(--text-primary);
      font-family: 'Manrope', sans-serif;
    }
    .brand h1 span {
      color: var(--accent-gold);
    }
    .icon-main {
      font-size: 48px;
      color: var(--accent-gold);
    }
    .subtitle {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--text-secondary);
      margin-bottom: 48px;
    }
    .input-group {
      text-align: left;
      margin-bottom: 24px;
    }
    .input-group label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-milled);
      padding: 14px 16px;
      border-radius: 4px;
      color: var(--text-primary);
      outline: none;
      transition: all 0.3s;
    }
    input:focus {
      border-color: var(--accent-gold-muted);
      background: rgba(0, 0, 0, 0.5);
    }
    .login-btn {
      width: 100%;
      padding: 16px;
      margin-top: 12px;
      justify-content: center;
      background: var(--accent-gold);
      color: #000;
      border: none;
    }
    .login-btn:hover {
      background: var(--accent-gold-bright);
    }
    .error-msg {
      color: #f87171;
      font-size: 12px;
      margin-top: 16px;
    }
    .footer-meta {
      margin-top: 48px;
      font-size: 9px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .status-dot {
      width: 4px;
      height: 4px;
      background: #4ade80;
      border-radius: 50%;
      box-shadow: 0 0 8px #4ade80;
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  recoveryPhrase = '';
  isRecovering = false;
  loading = false;
  error = '';

  constructor(private http: HttpClient, private router: Router) {}

  onLogin() {
    this.loading = true;
    this.error = '';
    
    this.http.post<any>('/api/auth/login', {
      username: this.username,
      password: this.password
    }).subscribe({
      next: (res) => {
        localStorage.setItem('webmail_token', res.token);
        sessionStorage.setItem('vault_key', res.vaultKey);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err.error.message || 'Authentication failed';
        this.loading = false;
      }
    });
  }

  onRecover() {
    this.loading = true;
    this.error = '';
    
    this.http.post<any>('/api/auth/recover-vault', {
      username: this.username,
      mnemonic: this.recoveryPhrase,
      newPassword: this.password
    }).subscribe({
      next: () => {
        alert('Transmission vault recovered and re-keyed. You can now login.');
        this.isRecovering = false;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error.message || 'Recovery failed';
        this.loading = false;
      }
    });
  }
}
