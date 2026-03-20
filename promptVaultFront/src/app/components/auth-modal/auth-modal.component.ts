import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
    }
    .sheet {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; box-shadow: 0 32px 80px rgba(0,0,0,0.2);
      width: 100%; max-width: 420px; margin: 1rem; padding: 32px;
      animation: sheetIn 220ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes sheetIn {
      from { opacity: 0; transform: translateY(20px) scale(.97) }
      to   { opacity: 1; transform: translateY(0) scale(1) }
    }
    .field-label {
      display: block; font-size: 12px; font-weight: 600;
      margin-bottom: 5px; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .field-input {
      width: 100%; padding: 9px 13px; font-size: 14px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 9px; color: var(--text); outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-bg);
    }
    .field-input::placeholder { color: var(--text-muted); opacity: 0.5; }
    .btn-primary {
      width: 100%; height: 40px; border-radius: 10px; border: none;
      font-size: 14px; font-weight: 600; cursor: pointer; color: #fff;
      background: var(--accent); transition: opacity 0.15s;
    }
    .btn-primary:hover { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
    .error-box {
      background: var(--hot-bg); border: 1px solid var(--hot);
      color: var(--hot); border-radius: 8px; padding: 10px 13px;
      font-size: 13px; margin-bottom: 16px;
    }
  `],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">

        <div class="flex justify-between items-center mb-6">
          <h2 class="font-display font-bold text-[18px]" style="color:var(--text);">
            {{ isRegister ? 'Create account' : 'Sign in' }}
          </h2>
          <button (click)="close.emit()" style="color:var(--text-muted);">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        @if (error) {
          <div class="error-box">{{ error }}</div>
        }

        @if (!isRegister) {
          <form (ngSubmit)="doLogin()" class="space-y-4">
            <div>
              <label class="field-label">Username</label>
              <input [(ngModel)]="loginForm.username" name="username" type="text" required class="field-input"/>
            </div>
            <div>
              <label class="field-label">Password</label>
              <input [(ngModel)]="loginForm.password" name="password" type="password" required class="field-input"/>
            </div>
            <button type="submit" [disabled]="loading" class="btn-primary">
              {{ loading ? 'Signing in…' : 'Sign In' }}
            </button>
          </form>
        } @else {
          <form (ngSubmit)="doRegister()" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="field-label">First name</label>
                <input [(ngModel)]="regForm.first_name" name="first_name" type="text" class="field-input"/>
              </div>
              <div>
                <label class="field-label">Last name</label>
                <input [(ngModel)]="regForm.last_name" name="last_name" type="text" class="field-input"/>
              </div>
            </div>
            <div>
              <label class="field-label">Username</label>
              <input [(ngModel)]="regForm.username" name="username" type="text" required class="field-input"/>
            </div>
            <div>
              <label class="field-label">Email</label>
              <input [(ngModel)]="regForm.email" name="email" type="email" class="field-input"/>
            </div>
            <div>
              <label class="field-label">Password</label>
              <input [(ngModel)]="regForm.password" name="password" type="password" required class="field-input"/>
            </div>
            <div>
              <label class="field-label">Confirm password</label>
              <input [(ngModel)]="regForm.password2" name="password2" type="password" required class="field-input"/>
            </div>
            <button type="submit" [disabled]="loading" class="btn-primary">
              {{ loading ? 'Creating…' : 'Create Account' }}
            </button>
          </form>
        }

        <p class="text-center text-[13px] mt-5" style="color:var(--text-muted);">
          {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
          <button (click)="isRegister = !isRegister; error = ''"
                  class="font-semibold ml-1" style="color:var(--accent-txt);">
            {{ isRegister ? 'Sign in' : 'Register' }}
          </button>
        </p>
      </div>
    </div>
  `,
})
export class AuthModalComponent {
  close = output<void>();
  private auth = inject(AuthService);

  isRegister = false;
  loading = false;
  error = '';

  loginForm = { username: '', password: '' };
  regForm = { username: '', email: '', first_name: '', last_name: '', password: '', password2: '' };

  doLogin() {
    this.loading = true; this.error = '';
    this.auth.login(this.loginForm.username, this.loginForm.password).subscribe({
      next: () => { this.loading = false; this.close.emit(); },
      error: () => { this.loading = false; this.error = 'Invalid username or password.'; },
    });
  }

  doRegister() {
    this.loading = true; this.error = '';
    this.auth.register(this.regForm).subscribe({
      next: () => {
        this.auth.login(this.regForm.username, this.regForm.password).subscribe({
          next: () => { this.loading = false; this.close.emit(); },
          error: () => { this.loading = false; this.isRegister = false; },
        });
      },
      error: (err) => { this.loading = false; this.error = JSON.stringify(err.error); },
    });
  }
}
