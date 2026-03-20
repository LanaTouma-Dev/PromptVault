import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PromptCardComponent } from '../../components/prompt-card/prompt-card.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';
import { SaveToCollectionModalComponent } from '../../components/save-to-collection-modal/save-to-collection-modal.component';

/* Deterministic colour hash — same as prompt-card */
function colorIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 5;
}

@Component({
  selector: 'app-my-prompts',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent, SidebarComponent, PromptCardComponent,
    AuthModalComponent, AddPromptModalComponent, SaveToCollectionModalComponent,
  ],
  styles: [`
    main { background: var(--bg); }

    /* ── Tab bar ── */
    .tab-bar {
      display: flex; gap: 4px; padding: 4px;
      border-radius: 10px; background: var(--surface2);
      border: 1px solid var(--border); margin-bottom: 24px;
    }
    .tab-btn {
      flex: 1; padding: 7px 16px; border-radius: 7px; border: none;
      font-size: 13px; font-weight: 500; cursor: pointer;
      transition: all 0.15s; background: transparent; color: var(--text-muted);
    }
    .tab-btn.active {
      background: var(--surface); color: var(--text);
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    /* ── Stats ── */
    .stats-strip {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 12px; margin-bottom: 24px;
    }
    .stat-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 16px 20px;
      display: flex; align-items: center; gap: 14px;
    }
    .stat-icon {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--accent-bg);
    }

    /* ── Prompt row: card + action footer ── */
    .prompt-row { display: flex; flex-direction: column; }

    /* Override the card's bottom radius so it blends into the action bar */
    .prompt-row ::ng-deep .card {
      border-radius: 12px 12px 0 0 !important;
      border-bottom: none !important;
    }

    .card-actions {
      display: flex; gap: 6px; padding: 8px 12px;
      background: var(--surface); border: 1px solid var(--border);
      border-top: 1px solid var(--border); border-radius: 0 0 12px 12px;
    }
    .action-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 6px 0; border-radius: 7px; font-size: 12px; font-weight: 500;
      cursor: pointer; border: 1px solid var(--border);
      background: transparent; color: var(--text-muted); transition: all 0.12s;
    }
    .action-btn:hover         { background: var(--surface2); color: var(--text); }
    .action-btn.danger:hover  { background: var(--hot-bg); color: var(--hot); border-color: var(--hot); }
    .action-btn.promote:hover { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--accent); }

    /* ── Visibility pill shown INSIDE the card header row ── */
    .vis-pill {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; font-size: 10px; font-weight: 700;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .vis-private { background: var(--hot-bg);    color: var(--hot); }
    .vis-shared  { background: var(--accent-bg); color: var(--accent-txt); }

    /* ── Skeleton / empty ── */
    .skeleton-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px;
    }
    .skeleton-line {
      border-radius: 6px; background: var(--surface2);
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 0; text-align: center;
    }
    .empty-icon {
      width: 64px; height: 64px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      background: var(--accent-bg); margin-bottom: 16px;
    }
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

    <main class="ml-56 pt-[52px] min-h-screen">
      <div class="max-w-5xl mx-auto px-6 py-6">

        <!-- Page header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="font-display font-bold text-[22px]" style="color:var(--text);">My Prompts</h1>
            <p class="text-[13px] mt-0.5" style="color:var(--text-muted);">
              All prompts you've created — private and shared
            </p>
          </div>
          <button (click)="showAddPrompt = true"
            class="flex items-center gap-1.5 h-9 px-4 text-white text-[13px] font-semibold
                   rounded-lg transition hover:opacity-85"
            style="background:var(--accent);">
            <span class="material-symbols-outlined text-[17px]">add</span>
            New Prompt
          </button>
        </div>

        <!-- Stats -->
        @if (!loading() && allPrompts().length > 0) {
          <div class="stats-strip">
            <div class="stat-card">
              <div class="stat-icon">
                <span class="material-symbols-outlined text-[20px]" style="color:var(--accent-txt);">description</span>
              </div>
              <div>
                <p class="font-display font-bold text-[22px]" style="color:var(--text);">{{ allPrompts().length }}</p>
                <p class="text-[12px]" style="color:var(--text-muted);">Total prompts</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background:var(--hot-bg);">
                <span class="material-symbols-outlined text-[20px]" style="color:var(--hot);">lock</span>
              </div>
              <div>
                <p class="font-display font-bold text-[22px]" style="color:var(--text);">{{ privateCount() }}</p>
                <p class="text-[12px]" style="color:var(--text-muted);">Private</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background:rgba(34,197,94,0.1);">
                <span class="material-symbols-outlined text-[20px]" style="color:#16a34a;">arrow_upward</span>
              </div>
              <div>
                <p class="font-display font-bold text-[22px]" style="color:var(--text);">{{ totalVotes() }}</p>
                <p class="text-[12px]" style="color:var(--text-muted);">Total votes</p>
              </div>
            </div>
          </div>
        }

        <!-- Tab bar -->
        <div class="tab-bar">
          <button class="tab-btn" [class.active]="activeTab() === 'all'" (click)="activeTab.set('all')">
            All ({{ allPrompts().length }})
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'shared'" (click)="activeTab.set('shared')">
            <span class="material-symbols-outlined text-[13px] align-middle mr-1">public</span>
            Shared ({{ sharedCount() }})
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'private'" (click)="activeTab.set('private')">
            <span class="material-symbols-outlined text-[13px] align-middle mr-1">lock</span>
            Private ({{ privateCount() }})
          </button>
        </div>

        <!-- Skeletons -->
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

        <!-- Empty -->
        } @else if (filteredPrompts().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <span class="material-symbols-outlined text-[28px]" style="color:var(--accent-txt);">
                {{ activeTab() === 'private' ? 'lock' : 'description' }}
              </span>
            </div>
            <p class="font-display font-bold text-[16px] mb-1" style="color:var(--text);">
              @if (activeTab() === 'private') { No private prompts yet }
              @else if (activeTab() === 'shared') { No shared prompts yet }
              @else { You haven't created any prompts yet }
            </p>
            <p class="text-[13px] mb-5" style="color:var(--text-muted);">
              @if (activeTab() === 'private') { Private prompts are only visible to you. }
              @else { Create your first prompt to get started. }
            </p>
            <button (click)="showAddPrompt = true"
              class="flex items-center gap-2 h-9 px-5 text-white text-[13px] font-semibold
                     rounded-lg transition hover:opacity-85"
              style="background:var(--accent);">
              <span class="material-symbols-outlined text-[17px]">add</span>
              Create a prompt
            </button>
          </div>

        <!-- Grid -->
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (p of filteredPrompts(); track p.id) {

              <!--
                We render a custom card manually here instead of <app-prompt-card>
                so we can inject the visibility pill cleanly in the header row
                without any z-index / absolute-positioning overlap.
              -->
              <div class="prompt-row">

                <!-- ── Inline card ── -->
                <div class="card group" style="cursor:pointer;"
                     (click)="router.navigate(['/prompt', p.id])">

                  <!-- Header: visibility + category + hot -->
                  <div class="flex items-center gap-2 flex-wrap mb-3">
                    <!-- Visibility pill — always first -->
                    <span class="vis-pill" [class]="p.visibility === 'private' ? 'vis-pill vis-private' : 'vis-pill vis-shared'">
                      <span class="material-symbols-outlined" style="font-size:10px;">
                        {{ p.visibility === 'private' ? 'lock' : 'public' }}
                      </span>
                      {{ p.visibility }}
                    </span>
                    @if (p.category) {
                      <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                            style="background:var(--accent-bg); color:var(--accent-txt);">
                        {{ p.category.name }}
                      </span>
                    }
                    @if (p.is_hot) {
                      <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                            style="background:var(--hot-bg); color:var(--hot);">🔥 Hot</span>
                    }
                  </div>

                  <!-- Title + description -->
                  <h3 class="font-display font-bold text-[15px] mb-1 line-clamp-2" style="color:var(--text);">
                    {{ p.title }}
                  </h3>
                  <p class="text-[13px] line-clamp-2 leading-relaxed mb-3" style="color:var(--text-muted);">
                    {{ p.description }}
                  </p>

                  <!-- Variable pills -->
                  @if (p.variables.length) {
                    <div class="flex flex-wrap gap-1.5 mb-3">
                      @for (v of p.variables.slice(0, 4); track v) {
                        <span class="inline-block px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md border"
                              [style]="paramStyle(v)">
                          {{ '{{' + v + '}}' }}
                        </span>
                      }
                      @if (p.variables.length > 4) {
                        <span class="text-[11px]" style="color:var(--text-muted);">+{{ p.variables.length - 4 }} more</span>
                      }
                    </div>
                  }

                  <!-- Tags -->
                  @if (p.tags.length) {
                    <div class="flex flex-wrap gap-1.5 mb-3" (click)="$event.stopPropagation()">
                      @for (tag of p.tags.slice(0, 4); track tag.id) {
                        <span class="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full"
                              [style]="tagStyle(tag.name)">
                          #{{ tag.name }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Footer: author + stats -->
                  <div class="flex items-center justify-between pt-2" style="border-top:1px solid var(--border);">
                    <div class="flex items-center gap-2">
                      <div class="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                           style="background:var(--accent);">
                        {{ p.author.username[0].toUpperCase() }}
                      </div>
                      <span class="text-[12px]" style="color:var(--text-muted);">{{ p.author.username }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-[12px]" style="color:var(--text-muted);">
                      <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined" style="font-size:15px;">arrow_upward</span>
                        {{ p.vote_count }}
                      </span>
                      <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined" style="font-size:15px;">content_copy</span>
                        {{ p.copy_count }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- ── Owner action bar ── -->
                <div class="card-actions">
                  <button class="action-btn promote" (click)="toggleVisibility(p)"
                    [title]="p.visibility === 'private' ? 'Make shared' : 'Make private'">
                    <span class="material-symbols-outlined" style="font-size:14px;">
                      {{ p.visibility === 'private' ? 'public' : 'lock' }}
                    </span>
                    {{ p.visibility === 'private' ? 'Make shared' : 'Make private' }}
                  </button>
                  <button class="action-btn danger" (click)="confirmDelete(p)">
                    <span class="material-symbols-outlined" style="font-size:14px;">delete</span>
                    Delete
                  </button>
                </div>

              </div>
            }
          </div>
        }

      </div>
    </main>

    <!-- Delete confirm modal -->
    @if (promptToDelete()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5); backdrop-filter:blur(4px);"
           (click)="promptToDelete.set(null)">
        <div class="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
             style="background:var(--surface); border:1px solid var(--border);"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto"
               style="background:var(--hot-bg);">
            <span class="material-symbols-outlined text-[22px]" style="color:var(--hot);">delete</span>
          </div>
          <h3 class="font-display font-bold text-[16px] text-center mb-1" style="color:var(--text);">
            Delete prompt?
          </h3>
          <p class="text-[13px] text-center mb-5" style="color:var(--text-muted);">
            "{{ promptToDelete()!.title }}" will be permanently removed. This cannot be undone.
          </p>
          <div class="flex gap-3">
            <button (click)="promptToDelete.set(null)"
              class="flex-1 h-9 rounded-lg text-[13px] font-semibold border transition"
              style="background:transparent; border-color:var(--border); color:var(--text-muted);">
              Cancel
            </button>
            <button (click)="doDelete()" [disabled]="deleting()"
              class="flex-1 h-9 rounded-lg text-[13px] font-semibold text-white border-none
                     transition hover:opacity-85 disabled:opacity-50"
              style="background:var(--hot);">
              {{ deleting() ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (showAuth)      { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt) { <app-add-prompt-modal (close)="showAddPrompt = false" (saved)="reload()" /> }
    @if (promptToSave)  {
      <app-save-to-collection-modal [prompt]="promptToSave" (close)="promptToSave = null" />
    }
  `,
})
export class MyPromptsComponent implements OnInit {
  private promptService = inject(PromptService);
  private auth          = inject(AuthService);
  router                = inject(Router);

  allPrompts     = signal<Prompt[]>([]);
  loading        = signal(true);
  activeTab      = signal<'all' | 'shared' | 'private'>('all');
  promptToDelete = signal<Prompt | null>(null);
  deleting       = signal(false);
  skeletons      = Array(6).fill(0);

  showAuth      = false;
  showAddPrompt = false;
  promptToSave: Prompt | null = null;

  filteredPrompts() {
    const tab = this.activeTab(), all = this.allPrompts();
    if (tab === 'shared')  return all.filter(p => p.visibility === 'shared');
    if (tab === 'private') return all.filter(p => p.visibility === 'private');
    return all;
  }
  sharedCount()  { return this.allPrompts().filter(p => p.visibility === 'shared').length; }
  privateCount() { return this.allPrompts().filter(p => p.visibility === 'private').length; }
  totalVotes()   { return this.allPrompts().reduce((s, p) => s + p.vote_count, 0); }

  paramStyle(name: string) {
    const i = colorIndex(name);
    return `background:var(--param-${i}-bg); color:var(--param-${i}-txt); border-color:var(--param-${i}-bd);`;
  }
  tagStyle(name: string) {
    const i = colorIndex(name);
    return `background:var(--tag-${i}-bg); color:var(--tag-${i}-txt);`;
  }

  ngOnInit() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/']); return; }
    this.loadPrompts();
  }

  loadPrompts() {
    this.loading.set(true);
    this.promptService.getMyPrompts().subscribe({
      next: res => { this.allPrompts.set(res.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleVisibility(p: Prompt) {
    const next = p.visibility === 'private' ? 'shared' : 'private';
    this.promptService.updatePrompt(p.id, { visibility: next }).subscribe(updated => {
      this.allPrompts.update(list =>
        list.map(x => x.id === p.id ? { ...x, visibility: updated.visibility } : x)
      );
    });
  }

  confirmDelete(p: Prompt) { this.promptToDelete.set(p); }

  doDelete() {
    const p = this.promptToDelete();
    if (!p) return;
    this.deleting.set(true);
    this.promptService.deletePrompt(p.id).subscribe({
      next: () => {
        this.allPrompts.update(list => list.filter(x => x.id !== p.id));
        this.promptToDelete.set(null);
        this.deleting.set(false);
      },
      error: () => this.deleting.set(false),
    });
  }

  onVoteChanged(event: { id: number; vote_count: number }) {
    this.allPrompts.update(list =>
      list.map(p => p.id === event.id ? { ...p, vote_count: event.vote_count, has_voted: !p.has_voted } : p)
    );
  }

  handleSaveToCollection(p: Prompt) {
    if (!this.auth.isLoggedIn()) this.showAuth = true;
    else this.promptToSave = p;
  }

  reload() { this.loadPrompts(); }
}
