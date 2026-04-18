import { Component, inject, output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoComponent],
  styles: [`
    .search-wrap {
      position: relative; max-width: 320px; flex: 1;
      transition: max-width 0.28s cubic-bezier(.22,1,.36,1);
    }
    .search-wrap:focus-within { max-width: 480px; }
    .search-icon {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      font-size: 16px; color: var(--text-muted); pointer-events: none;
      transition: color 0.15s;
    }
    .search-wrap:focus-within .search-icon { color: var(--accent-txt); }
    .search-input {
      width: 100%; padding: 5px 12px 5px 30px; font-size: 12.5px;
      border-radius: 99px; border: 1px solid var(--border);
      background: var(--surface2); color: var(--text); outline: none;
      transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    }
    .search-input:focus {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-bg);
    }
    .search-input::placeholder { color: var(--text-muted); opacity: 0.55; }

    .nav-bar {
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: box-shadow 0.22s, border-color 0.22s;
    }
    .nav-bar.scrolled {
      box-shadow: 0 4px 24px rgba(0,0,0,0.16);
      border-bottom-color: var(--border-mid) !important;
    }

    .avatar-wrap { position: relative; }
    .avatar-circle {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff; cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.15s, transform 0.15s;
    }
    .avatar-wrap:hover .avatar-circle {
      border-color: var(--accent);
      transform: scale(1.06);
    }
    .dropdown-menu {
      position: absolute; right: 0; top: calc(100% + 10px); width: 186px;
      border-radius: 14px; background: var(--surface); border: 1px solid var(--border);
      box-shadow: 0 12px 36px rgba(0,0,0,0.16);
      opacity: 0; transform: translateY(-10px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s cubic-bezier(.22,1,.36,1);
      z-index: 60;
    }
    .avatar-wrap:hover .dropdown-menu {
      opacity: 1; transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .dd-header { padding: 12px 14px; border-bottom: 1px solid var(--border); }
    .dd-item {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 14px; font-size: 12px; color: var(--text-muted);
      text-decoration: none; cursor: pointer; border: none; width: 100%;
      text-align: left; background: transparent;
      transition: background 0.12s, color 0.12s;
    }
    .dd-item:hover { background: var(--surface2); color: var(--text); }
    .dd-item:last-child { border-radius: 0 0 14px 14px; }
  `],
  template: `
    <nav class="nav-bar fixed top-0 z-50 w-full flex items-center px-5 gap-4"
         [class.scrolled]="scrolled()"
         style="height:44px; background:var(--navbar-bg); backdrop-filter:blur(18px);
                -webkit-backdrop-filter:blur(18px); border-bottom:1px solid var(--border);">

      <a routerLink="/" style="text-decoration:none; flex-shrink:0;">
        <app-logo [size]="28" [showText]="true" fontSize="14px" />
      </a>

      <div class="search-wrap">
        <span class="search-icon material-symbols-outlined">search</span>
        <input
          class="search-input"
          type="text"
          placeholder="Search prompts…"
          (input)="onSearch.emit($any($event.target).value)"
        />
      </div>

      <div class="flex items-center gap-2 ml-auto flex-shrink-0">

        <button (click)="theme.toggle()"
          class="h-7 w-7 rounded-lg flex items-center justify-center transition hover:opacity-80"
          style="border:1px solid var(--border); background:transparent; color:var(--text-muted);"
          title="Toggle theme">
          <span class="material-symbols-outlined text-[15px]">
            {{ theme.isDark() ? 'light_mode' : 'dark_mode' }}
          </span>
        </button>

        @if (auth.isLoggedIn()) {
          <button (click)="onAddPrompt.emit()"
            class="flex items-center gap-1 h-7 px-3 text-white text-[12px] font-semibold rounded-lg transition hover:opacity-85"
            style="background:var(--accent);">
            <span class="material-symbols-outlined text-[14px]">add</span>
            Add Prompt
          </button>

          <div class="avatar-wrap">
            <div class="avatar-circle" [style.background]="avatarBg()">
              {{ auth.user()?.username?.[0]?.toUpperCase() }}
            </div>
            <div class="dropdown-menu">
              <div class="dd-header">
                <p class="text-[13px] font-semibold" style="color:var(--text);">{{ auth.user()?.username }}</p>
                <p class="text-[11px] mt-0.5" style="color:var(--text-muted);">{{ auth.user()?.reputation ?? 0 }} reputation</p>
              </div>
              <a routerLink="/my-prompts" class="dd-item">
                <span class="material-symbols-outlined text-[15px]">description</span>
                My Prompts
              </a>
              <a routerLink="/my-forks" class="dd-item">
                <span class="material-symbols-outlined text-[15px]">fork_right</span>
                My Forks
              </a>
              <a routerLink="/shared-with-me" class="dd-item">
                <span class="material-symbols-outlined text-[15px]">group</span>
                Shared with me
              </a>
              <button (click)="auth.logout()" class="dd-item" style="color:var(--hot);">
                <span class="material-symbols-outlined text-[15px]">logout</span>
                Sign out
              </button>
            </div>
          </div>

        } @else {
          <button (click)="onLogin.emit()"
            class="h-7 px-3 text-[12px] font-semibold rounded-lg border transition hover:opacity-80"
            style="color:var(--accent-txt); border-color:var(--border-mid); background:transparent;">
            Sign In
          </button>
          <button (click)="onAddPrompt.emit()"
            class="flex items-center gap-1 h-7 px-3 text-white text-[12px] font-semibold rounded-lg transition hover:opacity-85"
            style="background:var(--accent);">
            <span class="material-symbols-outlined text-[14px]">add</span>
            Add Prompt
          </button>
        }
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  auth  = inject(AuthService);
  theme = inject(ThemeService);
  onSearch    = output<string>();
  onAddPrompt = output<void>();
  onLogin     = output<void>();
  scrolled    = signal(false);

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 8); }

  avatarBg() {
    const colors = ['#6054e8','#0d9488','#b45309','#be185d','#1d4ed8'];
    const u = this.auth.user()?.username ?? '';
    let h = 0;
    for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) >>> 0;
    return colors[h % 5];
  }
}
