import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" (click)="close.emit()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="font-display font-bold text-xl text-slate-900">{{ isRegister ? 'Create account' : 'Sign in' }}</h2>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        @if (error) {
          <div class="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{{ error }}</div>
        }

        <!-- Login form -->
        @if (!isRegister) {
          <form (ngSubmit)="doLogin()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input [(ngModel)]="loginForm.username" name="username" type="text" required
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input [(ngModel)]="loginForm.password" name="password" type="password" required
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
            <button type="submit" [disabled]="loading"
              class="w-full h-10 bg-primary text-white font-semibold rounded-lg hover:bg-blue-600 transition disabled:opacity-50">
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>
        } @else {
          <form (ngSubmit)="doRegister()" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">First name</label>
                <input [(ngModel)]="regForm.first_name" name="first_name" type="text"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Last name</label>
                <input [(ngModel)]="regForm.last_name" name="last_name" type="text"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input [(ngModel)]="regForm.username" name="username" type="text" required
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input [(ngModel)]="regForm.email" name="email" type="email"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input [(ngModel)]="regForm.password" name="password" type="password" required
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
              <input [(ngModel)]="regForm.password2" name="password2" type="password" required
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
            <button type="submit" [disabled]="loading"
              class="w-full h-10 bg-primary text-white font-semibold rounded-lg hover:bg-blue-600 transition disabled:opacity-50">
              {{ loading ? 'Creating...' : 'Create Account' }}
            </button>
          </form>
        }

        <p class="text-center text-sm text-slate-500 mt-5">
          {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
          <button (click)="isRegister = !isRegister; error = ''" class="text-primary font-medium ml-1">
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
          error: () => { this.loading = false; this.isRegister = false; }
        });
      },
      error: (err) => { this.loading = false; this.error = JSON.stringify(err.error); },
    });
  }
}
