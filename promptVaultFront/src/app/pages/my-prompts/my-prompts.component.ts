import { Component, OnInit, signal, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';
import { SaveToCollectionModalComponent } from '../../components/save-to-collection-modal/save-to-collection-modal.component';
import { SharePromptModalComponent } from '../../components/share-prompt-modal/share-prompt-modal.component';

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
    NavbarComponent, SidebarComponent,
    AuthModalComponent, AddPromptModalComponent, SaveToCollectionModalComponent,
    SharePromptModalComponent,
  ],
  styles: [`
    main { background: var(--bg); }

    /* ── Pill slider — full width ── */
    .pill-slider {
      position: relative;
      display: flex;          /* was inline-flex */
      width: 100%;            /* span full page width */
      align-items: center;
      padding: 3px;
      border-radius: 30px;
      background: var(--surface2);
      border: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .pill-thumb {
      position: absolute; top: 3px; height: calc(100% - 6px);
      border-radius: 24px; background: var(--surface);
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      transition: left 0.22s cubic-bezier(.22,1,.36,1), width 0.22s cubic-bezier(.22,1,.36,1);
      pointer-events: none; z-index: 0;
    }
    .pill-btn {
      flex: 1;                /* each button takes equal share */
      position: relative; z-index: 1;
      padding: 8px 0;
      border-radius: 24px; border: none;
      font-size: 13px; font-weight: 500; cursor: pointer;
      background: transparent; color: var(--text-muted);
      transition: color 0.15s; white-space: nowrap;
      text-align: center;
    }
    .pill-btn.active { color: var(--text); font-weight: 600; }

    /* ── Stats ── */
    .stats-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 16px 20px;
      display: flex; align-items: center; gap: 14px;
    }
    .stat-icon {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; background: var(--accent-bg);
    }

    /* ── Inline prompt card ── */
    .p-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px 12px 0 0; padding: 18px;
      display: flex; flex-direction: column; gap: 10px;
      cursor: pointer; transition: border-color 0.15s;
    }
    .p-card:hover { border-color: var(--border-mid); }

    /* ── Owner actions row ── */
    .owner-actions {
      display: flex; gap: 6px; padding: 8px 12px;
      background: var(--surface); border: 1px solid var(--border);
      border-top: none; border-radius: 0 0 12px 12px;
    }
    .oa-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 6px 0; border-radius: 7px; font-size: 12px; font-weight: 500;
      cursor: pointer; border: 1px solid var(--border);
      background: transparent; color: var(--text-muted); transition: all 0.12s;
    }
    .oa-btn:hover        { background: var(--surface2); color: var(--text); }
    .oa-btn.edit:hover   { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--accent); }
    .oa-btn.vis:hover    { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--accent); }
    .oa-btn.danger:hover { background: var(--hot-bg); color: var(--hot); border-color: var(--hot); }

    /* ── Visibility pill ── */
    .vis-pill {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; font-size: 10px; font-weight: 700;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .vis-private { background: var(--hot-bg); color: var(--hot); }
    .vis-shared  { background: var(--accent-bg); color: var(--accent-txt); }

    /* ── Skeletons / empty ── */
    .skeleton-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .skeleton-line { border-radius: 6px; background: var(--surface2); animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; text-align: center; }
    .empty-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: var(--accent-bg); margin-bottom: 16px; }

    /* Fork highlight */
    .fork-highlight .p-card {
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3px var(--accent-bg), 0 4px 20px rgba(96,84,232,0.15);
      animation: forkPulse 1s ease 0.2s both;
    }
    @keyframes forkPulse { 0%{transform:scale(1)} 50%{transform:scale(1.012)} 100%{transform:scale(1)} }
    .fork-new-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700;
      background: var(--accent); color: #fff; text-transform: uppercase; letter-spacing: 0.05em;
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

    <main class="ml-56 pt-[44px] min-h-screen">
      <div class="max-w-5xl mx-auto px-6 py-6">

        <!-- Fork success banner -->
        @if (forkedPromptId()) {
          <div class="flex items-center gap-3 px-4 py-3 rounded-12 mb-5"
               style="background:var(--accent-bg); border:1px solid var(--accent); border-radius:12px;">
            <span class="material-symbols-outlined" style="font-size:20px; color:var(--accent-txt);">fork_right</span>
            <div>
              <p style="font-size:13px; font-weight:700; color:var(--accent-txt);">Fork created! It's highlighted below.</p>
              <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Click <strong style="color:var(--text);">Edit</strong> to modify it, then set visibility to <strong style="color:var(--text);">Shared</strong> to publish it.</p>
            </div>
          </div>
        }

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="font-display font-bold text-[22px]" style="color:var(--text);">My Prompts</h1>
            <p class="text-[13px] mt-0.5" style="color:var(--text-muted);">All prompts you've created — private and shared</p>
          </div>
          <button (click)="showAddPrompt = true"
            class="flex items-center gap-1.5 h-9 px-4 text-white text-[13px] font-semibold rounded-lg transition hover:opacity-85"
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
                <p class="text-[12px]" style="color:var(--text-muted);">Total</p>
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

        <!-- Pill slider — full width -->
        <div class="pill-slider" #sliderRef>
          <div class="pill-thumb" [style.left.px]="thumbLeft" [style.width.px]="thumbWidth"></div>
          <button #btn0 class="pill-btn" [class.active]="activeTab()==='all'"
            (click)="setTab('all', btn0)">
            All ({{ allPrompts().length }})
          </button>
          <button #btn1 class="pill-btn" [class.active]="activeTab()==='shared'"
            (click)="setTab('shared', btn1)">
            <span class="material-symbols-outlined text-[13px] align-middle mr-1">public</span>
            Public ({{ sharedCount() }})
          </button>
          <button #btn2 class="pill-btn" [class.active]="activeTab()==='private'"
            (click)="setTab('private', btn2)">
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
              @else if (activeTab() === 'shared') { No public prompts yet }
              @else { No prompts yet }
            </p>
            <p class="text-[13px] mb-5" style="color:var(--text-muted);">
              @if (activeTab() === 'private') { Private prompts are only visible to you. }
              @else { Create your first prompt to get started. }
            </p>
            <button (click)="showAddPrompt = true"
              class="flex items-center gap-2 h-9 px-5 text-white text-[13px] font-semibold rounded-lg transition hover:opacity-85"
              style="background:var(--accent);">
              <span class="material-symbols-outlined text-[17px]">add</span> Create a prompt
            </button>
          </div>

        <!-- Grid -->
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (p of filteredPrompts(); track p.id) {
              <div style="display:flex; flex-direction:column;" [class.fork-highlight]="forkedPromptId() === p.id">

                <div class="p-card" (click)="router.navigate(['/prompt', p.id])">
                  <div class="flex items-center gap-2 flex-wrap">
                    @if (forkedPromptId() === p.id) {
                      <span class="fork-new-badge">
                        <span class="material-symbols-outlined" style="font-size:11px;">fork_right</span>
                        New fork
                      </span>
                    }
                    <span class="vis-pill" [class]="p.visibility==='private'?'vis-pill vis-private':'vis-pill vis-shared'">
                      <span class="material-symbols-outlined" style="font-size:10px;">{{ p.visibility==='private'?'lock':'public' }}</span>
                      {{ p.visibility==='private' ? 'Private' : 'Public' }}
                    </span>
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
                        <span class="inline-block px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md border" [style]="paramStyle(v)">
                          {{ '{{' + v + '}}' }}
                        </span>
                      }
                      @if (p.variables.length > 3) {
                        <span class="text-[11px]" style="color:var(--text-muted);">+{{ p.variables.length - 3 }}</span>
                      }
                    </div>
                  }

                  @if (p.tags.length) {
                    <div class="flex flex-wrap gap-1.5" (click)="$event.stopPropagation()">
                      @for (tag of p.tags.slice(0, 3); track tag.id) {
                        <span class="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full" [style]="tagStyle(tag.name)">
                          #{{ tag.name }}
                        </span>
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

                <div class="owner-actions">
                  <button class="oa-btn edit" (click)="openEdit(p)">
                    <span class="material-symbols-outlined" style="font-size:14px;">edit</span>Edit
                  </button>
                  <button class="oa-btn vis" (click)="toggleVisibility(p)">
                    <span class="material-symbols-outlined" style="font-size:14px;">{{ p.visibility==='private'?'public':'lock' }}</span>
                    {{ p.visibility==='private'?'Make public':'Make private' }}
                  </button>
                  @if (p.visibility === 'private') {
                    <button class="oa-btn" (click)="openShare(p)">
                      <span class="material-symbols-outlined" style="font-size:14px;">person_add</span>Share
                    </button>
                  }
                  <button class="oa-btn danger" (click)="confirmDelete(p)">
                    <span class="material-symbols-outlined" style="font-size:14px;">delete</span>Delete
                  </button>
                </div>

              </div>
            }
          </div>
        }

      </div>
    </main>

    <!-- Delete confirm -->
    @if (promptToDelete()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5); backdrop-filter:blur(4px);" (click)="promptToDelete.set(null)">
        <div class="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
             style="background:var(--surface); border:1px solid var(--border);" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto" style="background:var(--hot-bg);">
            <span class="material-symbols-outlined text-[22px]" style="color:var(--hot);">delete</span>
          </div>
          <h3 class="font-display font-bold text-[16px] text-center mb-1" style="color:var(--text);">Delete prompt?</h3>
          <p class="text-[13px] text-center mb-5" style="color:var(--text-muted);">
            "{{ promptToDelete()!.title }}" will be permanently removed. This cannot be undone.
          </p>
          <div class="flex gap-3">
            <button (click)="promptToDelete.set(null)"
              class="flex-1 h-9 rounded-lg text-[13px] font-semibold border transition"
              style="background:transparent; border-color:var(--border); color:var(--text-muted);">Cancel</button>
            <button (click)="doDelete()" [disabled]="deleting()"
              class="flex-1 h-9 rounded-lg text-[13px] font-semibold text-white border-none transition hover:opacity-85 disabled:opacity-50"
              style="background:var(--hot);">{{ deleting() ? 'Deleting…' : 'Delete' }}</button>
          </div>
        </div>
      </div>
    }

    @if (showAuth)      { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt) { <app-add-prompt-modal (close)="closeAddModal()" (saved)="reload()" /> }
    @if (showEditModal && promptToEdit()) {
      <app-add-prompt-modal
        [promptToEdit]="promptToEdit()"
        (close)="closeEditModal()"
        (saved)="reload()"
      />
    }
    @if (promptToSave) {
      <app-save-to-collection-modal [prompt]="promptToSave" (close)="promptToSave = null" />
    }
    @if (promptToShare()) {
      <app-share-prompt-modal [promptId]="promptToShare()!.id" (close)="promptToShare.set(null)" />
    }
  `,
})
export class MyPromptsComponent implements OnInit, AfterViewInit {
  private promptService = inject(PromptService);
  private auth          = inject(AuthService);
  router                = inject(Router);
  private route         = inject(ActivatedRoute);

  allPrompts     = signal<Prompt[]>([]);
  loading        = signal(true);
  activeTab      = signal<'all' | 'shared' | 'private'>('all');
  promptToDelete = signal<Prompt | null>(null);
  promptToEdit   = signal<Prompt | null>(null);
  promptToShare  = signal<Prompt | null>(null);
  deleting       = signal(false);
  skeletons      = Array(6).fill(0);

  showAuth      = false;
  showAddPrompt = false;
  showEditModal = false;
  promptToSave: Prompt | null = null;
  forkedPromptId = signal<number | null>(null);

  thumbLeft  = 3;
  thumbWidth = 80;

  @ViewChild('btn0') btn0!: ElementRef<HTMLButtonElement>;
  @ViewChild('btn1') btn1!: ElementRef<HTMLButtonElement>;
  @ViewChild('btn2') btn2!: ElementRef<HTMLButtonElement>;

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
    // If we arrived here from a fork, highlight that card and switch to Private tab
    const forkedId = this.route.snapshot.queryParams['forked'];
    if (forkedId) {
      this.forkedPromptId.set(+forkedId);
      this.activeTab.set('private');
      setTimeout(() => {
        this.snapThumb(this.btn2.nativeElement);
        // Clear highlight after 6s
        setTimeout(() => this.forkedPromptId.set(null), 6000);
      }, 300);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.snapThumb(this.btn0.nativeElement), 0);
  }

  setTab(tab: 'all' | 'shared' | 'private', btnEl: HTMLButtonElement) {
    this.activeTab.set(tab);
    this.snapThumb(btnEl);
  }

  private snapThumb(el: HTMLButtonElement) {
    const slider = el.closest('.pill-slider') as HTMLElement;
    if (!slider) return;
    const sliderRect = slider.getBoundingClientRect();
    const btnRect    = el.getBoundingClientRect();
    this.thumbLeft  = btnRect.left - sliderRect.left;
    this.thumbWidth = btnRect.width;
  }

  loadPrompts() {
    this.loading.set(true);
    this.promptService.getMyOwnPrompts().subscribe({
      next: res => { this.allPrompts.set(res.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openEdit(p: Prompt)  { this.promptToEdit.set(p); this.showEditModal = true; }
  openShare(p: Prompt) { this.promptToShare.set(p); }
  closeEditModal()    { this.showEditModal = false; this.promptToEdit.set(null); }
  closeAddModal()     { this.showAddPrompt = false; }

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

  reload() { this.loadPrompts(); }
}
