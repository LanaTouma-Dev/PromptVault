import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="fixed top-0 z-50 w-full flex items-center px-5 gap-6"
         style="height:52px; background:rgba(255,255,255,0.82); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-bottom:1px solid rgba(0,0,0,0.07); box-shadow:0 1px 3px rgba(0,0,0,0.04);">

      <!-- Brand -->
      <div class="flex items-center gap-2.5 flex-shrink-0">
        <div class="flex flex-col leading-none">
          <span class="font-display font-bold text-[13px] text-slate-900 tracking-tight">PromptVault</span>
        </div>
      </div>

      <!-- Search : pill style, takes remaining space -->
      <div class="flex-1 max-w-md">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                style="font-size:17px;">search</span>
          <input
            type="text"
            placeholder="Search prompts..."
            class="w-full pl-8 pr-4 py-1.5 text-[13px] bg-slate-100 rounded-full border border-transparent
                   focus:outline-none focus:bg-white focus:border-slate-300 transition"
            (input)="onSearch.emit($any($event.target).value)"
          />
        </div>
      </div>


      <!-- Actions : pushed right -->
      <div class="flex items-center gap-2.5 ml-auto flex-shrink-0">
        @if (auth.isLoggedIn()) {
          <button
            (click)="onAddPrompt.emit()"
            class="flex items-center gap-1 h-8 px-3.5 text-white text-[13px] font-semibold rounded-md transition hover:opacity-85"
            style="background:#C8102E;"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            Add Prompt
          </button>
          <!-- Avatar with logout on hover -->
          <div class="relative group">
            <div class="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer select-none"
                 style="background:#C8102E;">
              {{ auth.user()?.username?.[0]?.toUpperCase() }}
            </div>
            <!-- Dropdown -->
            <div class="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-lg shadow-lg
                        opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
              <div class="px-3 py-2 border-b border-slate-100">
                <p class="text-[12px] font-semibold text-slate-800">{{ auth.user()?.username }}</p>
                <p class="text-[11px] text-slate-400">Signed in</p>
              </div>
              <button
                (click)="auth.logout()"
                class="w-full text-left px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50 rounded-b-lg transition"
              >
                Sign out
              </button>
            </div>
          </div>
        } @else {
          <button
            (click)="onLogin.emit()"
            class="h-8 px-3.5 text-[13px] font-semibold rounded-md border transition hover:bg-red-50"
            style="color:#C8102E; border-color:#C8102E;"
          >
            Sign In
          </button>
          <button
            (click)="onAddPrompt.emit()"
            class="flex items-center gap-1 h-8 px-3.5 text-white text-[13px] font-semibold rounded-md transition hover:opacity-85"
            style="background:#C8102E;"
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
  auth = inject(AuthService);
  onSearch = output<string>();
  onAddPrompt = output<void>();
  onLogin = output<void>();
}
