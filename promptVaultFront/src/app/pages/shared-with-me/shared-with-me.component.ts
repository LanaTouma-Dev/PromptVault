import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';

@Component({
  selector: 'app-shared-with-me',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent, AuthModalComponent, AddPromptModalComponent],
  styles: [`
    main { background: var(--bg); }
    .p-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 18px; display: flex; flex-direction: column;
      gap: 10px; cursor: pointer; transition: border-color 0.15s;
    }
    .p-card:hover { border-color: var(--border-mid); }
    .shared-by-banner {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 20px; width: fit-content;
      background: var(--accent-bg); border: 1px solid var(--border-mid);
      font-size: 11px; color: var(--accent-txt); font-weight: 500;
    }
    .skeleton-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .skeleton-line { border-radius: 6px; background: var(--surface2); animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; text-align: center; }
    .empty-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: var(--accent-bg); margin-bottom: 16px; }
  `],
  template: `
    <app-navbar
      (onSearch)="router.navigate(['/'], { queryParams: { q: $event } })"
      (onAddPrompt)="showAddPrompt = true"
      (onLogin)="showAuth = true"
    />
    <app-sidebar [activeCategory]="''" [totalCount]="0"
      (selectCategory)="router.navigate(['/'], { queryParams: { cat: $event } })"
      (selectTag)="router.navigate(['/'], { queryParams: { tag: $event } })"
    />

    <main class="ml-56 pt-[44px] min-h-screen">
      <div class="max-w-5xl mx-auto px-6 py-6">

        <div class="mb-6">
          <h1 class="font-display font-bold text-[22px]" style="color:var(--text);">Shared with me</h1>
          <p class="text-[13px] mt-0.5" style="color:var(--text-muted);">Private prompts others have shared with you directly</p>
        </div>

        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (i of skeletons; track i) {
              <div class="skeleton-card">
                <div class="skeleton-line h-3 w-1/4 mb-3"></div>
                <div class="skeleton-line h-4 w-3/4 mb-2"></div>
                <div class="skeleton-line h-3 w-full mb-1.5"></div>
                <div class="skeleton-line h-3 w-2/3"></div>
              </div>
            }
          </div>

        } @else if (prompts().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <span class="material-symbols-outlined text-[28px]" style="color:var(--accent-txt);">group</span>
            </div>
            <p class="font-display font-bold text-[16px] mb-1" style="color:var(--text);">Nothing shared with you yet</p>
            <p class="text-[13px]" style="color:var(--text-muted);">When someone shares a private prompt with you, it will appear here.</p>
          </div>

        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (p of prompts(); track p.id) {
              <div class="p-card" (click)="router.navigate(['/prompt', p.id])">

                @if (p.shared_by) {
                  <div class="shared-by-banner">
                    <span class="material-symbols-outlined" style="font-size:13px;">person</span>
                    Shared by {{ p.shared_by.username }}
                  </div>
                }

                <div class="flex items-center gap-2 flex-wrap">
                  @if (p.category) {
                    <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                          style="background:var(--accent-bg); color:var(--accent-txt);">{{ p.category.name }}</span>
                  }
                  @if (p.is_hot) {
                    <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                          style="background:var(--hot-bg); color:var(--hot);">🔥 Hot</span>
                  }
                </div>

                <h3 class="font-display font-bold text-[15px] line-clamp-2" style="color:var(--text);">{{ p.title }}</h3>
                <p class="text-[13px] line-clamp-2 leading-relaxed" style="color:var(--text-muted);">{{ p.description }}</p>

                @if (p.variables.length) {
                  <div class="flex flex-wrap gap-1.5">
                    @for (v of p.variables.slice(0, 3); track v) {
                      <span class="inline-block px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md border"
                            style="background:rgba(217,119,6,0.08); color:#b45309; border-color:rgba(217,119,6,0.25);">
                        {{ '{{' + v + '}}' }}
                      </span>
                    }
                    @if (p.variables.length > 3) {
                      <span class="text-[11px]" style="color:var(--text-muted);">+{{ p.variables.length - 3 }}</span>
                    }
                  </div>
                }

                <div class="flex items-center justify-between pt-2" style="border-top:1px solid var(--border); margin-top:auto;">
                  <span class="text-[12px]" style="color:var(--text-muted);">{{ p.author.username }}</span>
                  <div class="flex items-center gap-3 text-[12px]" style="color:var(--text-muted);">
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined" style="font-size:15px;">arrow_upward</span>{{ p.vote_count }}
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined" style="font-size:15px;">content_copy</span>{{ p.copy_count }}
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

      </div>
    </main>

    @if (showAuth)      { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt) { <app-add-prompt-modal (close)="showAddPrompt = false" (saved)="showAddPrompt = false" /> }
  `,
})
export class SharedWithMeComponent implements OnInit {
  router = inject(Router);
  private promptService = inject(PromptService);
  private auth          = inject(AuthService);

  prompts  = signal<Prompt[]>([]);
  loading  = signal(true);
  skeletons = Array(6).fill(0);

  showAuth      = false;
  showAddPrompt = false;

  ngOnInit() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/']); return; }
    this.promptService.getSharedWithMe().subscribe({
      next: res => { this.prompts.set(res.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
