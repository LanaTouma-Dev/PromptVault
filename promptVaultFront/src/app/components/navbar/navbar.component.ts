import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoComponent],
  template: `
    <nav class="fixed top-0 z-50 w-full flex items-center px-5 gap-6"
         style="height:52px; background:var(--navbar-bg); backdrop-filter:blur(16px);
                -webkit-backdrop-filter:blur(16px); border-bottom:1px solid var(--border);
                box-shadow:0 1px 3px rgba(0,0,0,0.04);">

      <!-- Brand -->
      <a routerLink="/" style="text-decoration:none;">
        <app-logo [size]="28" [showText]="true" fontSize="14px" />
      </a>

      <!-- Search -->
      <div class="flex-1 max-w-md">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px]"
                style="color:var(--text-muted);">search</span>
          <input
            type="text"
            placeholder="Search prompts..."
            class="w-full pl-8 pr-4 py-1.5 text-[13px] rounded-full border transition focus:outline-none"
            style="background:var(--surface2); border-color:var(--border); color:var(--text);"
            (focus)="$any($event.target).style.background='var(--surface)';
                     $any($event.target).style.borderColor='var(--border-mid)'"
            (blur)="$any($event.target).style.background='var(--surface2)';
                    $any($event.target).style.borderColor='var(--border)'"
            (input)="onSearch.emit($any($event.target).value)"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 ml-auto flex-shrink-0">

        <!-- Theme toggle -->
        <button
          (click)="theme.toggle()"
          class="h-8 w-8 rounded-lg flex items-center justify-center transition"
          style="border:1px solid var(--border); background:transparent; color:var(--text-muted);"
          title="Toggle theme"
        >
          <span class="material-symbols-outlined text-[17px]">
            {{ theme.isDark() ? 'light_mode' : 'dark_mode' }}
          </span>
        </button>

        @if (auth.isLoggedIn()) {
          <button
            (click)="onAddPrompt.emit()"
            class="flex items-center gap-1 h-8 px-3.5 text-white text-[13px] font-semibold rounded-lg transition hover:opacity-85"
            style="background:var(--accent);"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            Add Prompt
          </button>

          <!-- Avatar dropdown -->
          <div class="relative group">
            <div class="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold
                        text-white cursor-pointer select-none"
                 style="background:var(--accent);">
              {{ auth.user()?.username?.[0]?.toUpperCase() }}
            </div>
            <div class="absolute right-0 top-full mt-1.5 w-44 rounded-xl shadow-lg border
                        opacity-0 group-hover:opacity-100 pointer-events-none
                        group-hover:pointer-events-auto transition-opacity z-50"
                 style="background:var(--surface); border-color:var(--border);">
              <div class="px-3 py-2.5" style="border-bottom:1px solid var(--border);">
                <p class="text-[12px] font-semibold" style="color:var(--text);">
                  {{ auth.user()?.username }}
                </p>
                <p class="text-[11px]" style="color:var(--text-muted);">Signed in</p>
              </div>
              <a routerLink="/my-prompts"
                 class="flex items-center gap-2 px-3 py-2 text-[12px] transition rounded-none
                        hover:opacity-80"
                 style="color:var(--text-muted); text-decoration:none;">
                <span class="material-symbols-outlined text-[15px]">lock</span>
                My Private Prompts
              </a>
              <button
                (click)="auth.logout()"
                class="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px]
                       transition rounded-b-xl hover:opacity-80"
                style="color:var(--text-muted);"
              >
                <span class="material-symbols-outlined text-[15px]">logout</span>
                Sign out
              </button>
            </div>
          </div>

        } @else {
          <button
            (click)="onLogin.emit()"
            class="h-8 px-3.5 text-[13px] font-semibold rounded-lg border transition hover:opacity-80"
            style="color:var(--accent); border-color:var(--border-mid); background:transparent;"
          >
            Sign In
          </button>
          <button
            (click)="onAddPrompt.emit()"
            class="flex items-center gap-1 h-8 px-3.5 text-white text-[13px] font-semibold
                   rounded-lg transition hover:opacity-85"
            style="background:var(--accent);"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
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
}
