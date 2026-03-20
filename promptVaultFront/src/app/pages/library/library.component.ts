import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PromptCardComponent } from '../../components/prompt-card/prompt-card.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';
import { SaveToCollectionModalComponent } from '../../components/save-to-collection-modal/save-to-collection-modal.component';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule, NavbarComponent, SidebarComponent, PromptCardComponent,
    AuthModalComponent, AddPromptModalComponent, SaveToCollectionModalComponent,
  ],
  styles: [`
    :host { display: block; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }

    main { background: var(--bg); }

    .banner {
      border-radius: 16px; padding: 24px 28px; margin-bottom: 28px;
      position: relative; overflow: hidden;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
      border: 1px solid rgba(99,102,241,0.3);
    }
    .banner-glow {
      position: absolute; right: -60px; top: -60px;
      width: 220px; height: 220px; border-radius: 50%;
      background: var(--accent); opacity: 0.18; filter: blur(60px); pointer-events: none;
    }
    .hot-card {
      flex-shrink: 0; width: 230px; background: var(--surface);
      border: 1px solid var(--border); border-radius: 12px; padding: 14px;
      cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .hot-card:hover { border-color: var(--border-mid); box-shadow: 0 4px 14px rgba(96,84,232,0.09); }
    .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .sort-select {
      font-size: 13px; padding: 6px 10px; border-radius: 8px; cursor: pointer;
      border: 1px solid var(--border); background: var(--surface); color: var(--text);
      outline: none; transition: border-color 0.12s;
    }
    .sort-select:focus { border-color: var(--border-mid); }
    .chip {
      font-size: 12px; padding: 4px 12px; border-radius: 20px;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--text-muted); cursor: pointer; transition: all 0.12s;
    }
    .chip.active { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--border-mid); }
    .skeleton-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .skeleton-line { border-radius: 6px; background: var(--surface2); animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
    .pager-btn {
      height: 36px; padding: 0 18px; font-size: 13px;
      border: 1px solid var(--border); border-radius: 8px;
      background: var(--surface); color: var(--text-muted);
      cursor: pointer; transition: all 0.12s;
    }
    .pager-btn:hover:not(:disabled) { border-color: var(--border-mid); color: var(--text); }
    .pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
  template: `
    <app-navbar
      (onSearch)="handleSearch($event)"
      (onAddPrompt)="handleAddPrompt()"
      (onLogin)="showAuth = true"
    />
    <app-sidebar
      [activeCategory]="activeCategory()"
      [activeTag]="activeTag()"
      [totalCount]="totalCount()"
      (selectCategory)="setCategory($event)"
      (selectTag)="setTag($event)"
    />

    <main class="ml-56 pt-[52px] min-h-screen">
      <div class="max-w-5xl mx-auto px-6 py-6">

        @if (auth.isLoggedIn()) {
          <div class="banner">
            <div class="banner-glow"></div>
            <div class="relative z-10 flex items-center justify-between">
              <div>
                <h1 class="font-display font-bold text-[22px] text-white mb-1.5">
                  Good morning, {{ auth.user()?.first_name || auth.user()?.username }} 👋
                </h1>
                <p class="text-indigo-200 text-[13px]">
                  Welcome back to PromptOverflow. You have {{ totalCount() }} prompts available.
                </p>
              </div>
              <button (click)="handleAddPrompt()"
                class="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition"
                style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18);"
                (mouseenter)="$any($event.target).style.background='rgba(255,255,255,0.2)'"
                (mouseleave)="$any($event.target).style.background='rgba(255,255,255,0.12)'">
                <span class="material-symbols-outlined text-[17px]">add</span>
                New Prompt
              </button>
            </div>
          </div>
        }

        @if (hotPrompts().length && activeCategory() === 'all' && !searchQuery()) {
          <section class="mb-8">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-symbols-outlined text-[20px]" style="color:var(--hot);">local_fire_department</span>
              <h2 class="font-display font-bold text-[15px]" style="color:var(--text);">Hot Prompts</h2>
            </div>
            <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              @for (p of hotPrompts(); track p.id) {
                <div class="hot-card" (click)="openDetail(p)">
                  @if (p.category) {
                    <span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full mb-2"
                          style="background:var(--hot-bg); color:var(--hot);">{{ p.category.name }}</span>
                  }
                  <p class="font-display font-bold text-[13px] line-clamp-2 mb-1" style="color:var(--text);">{{ p.title }}</p>
                  <p class="text-[12px] line-clamp-2" style="color:var(--text-muted);">{{ p.description }}</p>
                  <div class="flex items-center gap-3 mt-3 text-[11px]" style="color:var(--text-muted);">
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined" style="font-size:13px;">arrow_upward</span>{{ p.vote_count }}
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined" style="font-size:13px;">content_copy</span>{{ p.copy_count }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <div class="toolbar">
          <div class="flex items-center gap-3 flex-wrap">
            <h2 class="font-display font-bold text-[16px]" style="color:var(--text);">
              @if (searchQuery()) {
                Results for "{{ searchQuery() }}"
                <span class="text-[13px] font-normal ml-1" style="color:var(--text-muted);">({{ totalCount() }} found)</span>
              } @else {
                Prompt Library
                <span class="text-[13px] font-normal ml-1" style="color:var(--text-muted);">{{ totalCount() }} prompts</span>
              }
            </h2>
            @if (activeTag()) {
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                   style="background:var(--accent-bg); color:var(--accent-txt); border:1px solid var(--border-mid);">
                <span>#{{ activeTag() }}</span>
                <button (click)="setTag(null)" class="flex items-center justify-center rounded-full w-4 h-4 hover:opacity-70">
                  <span class="material-symbols-outlined" style="font-size:12px;">close</span>
                </button>
              </div>
            }
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[12px]" style="color:var(--text-muted);">Sort by</span>
            <select class="sort-select" [value]="ordering()" (change)="setOrdering($any($event.target).value)">
              <option value="-created_at">Newest</option>
              <option value="-vote_count">Most Voted</option>
              <option value="-copy_count">Most Copied</option>
            </select>
          </div>
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
          <div class="flex flex-col items-center justify-center py-24 text-center">
            <span class="material-symbols-outlined text-5xl mb-3" style="color:var(--border-mid);">search_off</span>
            <p class="font-medium" style="color:var(--text-muted);">No prompts found</p>
            <p class="text-[13px] mt-1" style="color:var(--text-muted);">Try a different search or category</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (p of prompts(); track p.id) {
              <app-prompt-card
                [prompt]="p"
                (open)="openDetail($event)"
                (voteChanged)="onVoteChanged($event)"
                (saveToCollection)="handleSaveToCollection(p)"
              />
            }
          </div>
        }

        @if (totalCount() > pageSize && !loading()) {
          <div class="flex items-center justify-center gap-3 mt-8">
            <button class="pager-btn" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">Previous</button>
            <span class="text-[13px]" style="color:var(--text-muted);">Page {{ currentPage() }} of {{ totalPages }}</span>
            <button class="pager-btn" [disabled]="currentPage() === totalPages" (click)="goToPage(currentPage() + 1)">Next</button>
          </div>
        }
      </div>
    </main>

    @if (showAuth)        { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt)   { <app-add-prompt-modal (close)="showAddPrompt = false" (saved)="reload()" /> }
    @if (promptToSave())  {
      <app-save-to-collection-modal
        [prompt]="promptToSave()!"
        (close)="promptToSave.set(null)"
      />
    }
  `,
})
export class LibraryComponent implements OnInit {
  private promptService = inject(PromptService);
  auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  prompts      = signal<Prompt[]>([]);
  hotPrompts   = signal<Prompt[]>([]);
  totalCount   = signal(0);
  loading      = signal(true);
  activeCategory = signal('all');
  activeTag    = signal<string | null>(null);
  ordering     = signal('-created_at');
  currentPage  = signal(1);
  pageSize     = 20;
  skeletons    = Array(6).fill(0);

  showAuth      = false;
  showAddPrompt = false;
  // ← was plain property; now a signal so Angular detects the change
  promptToSave  = signal<Prompt | null>(null);

  private searchSubject = new Subject<string>();
  private _searchQuery  = signal('');
  searchQuery = this._searchQuery.asReadonly();

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.activeCategory.set(params['cat'] ?? 'all');
      this.activeTag.set(params['tag'] ?? null);
      this._searchQuery.set(params['q'] ?? '');
      this.ordering.set(params['ordering'] ?? '-created_at');
      this.currentPage.set(params['page'] ? +params['page'] : 1);
      this.loadPrompts();
    });
    this.loadHotPrompts();
    this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(q => {
      this.router.navigate([], {
        queryParams: { q: q || null, cat: this.activeCategory() === 'all' ? null : this.activeCategory(), tag: this.activeTag() },
        queryParamsHandling: 'merge',
      });
    });
  }

  handleSearch(q: string)  { this.searchSubject.next(q); }

  setCategory(slug: string) {
    this.router.navigate([], { queryParams: { cat: slug === 'all' ? null : slug, page: null }, queryParamsHandling: 'merge' });
  }
  setTag(slug: string | null) {
    this.router.navigate([], { queryParams: { tag: slug, page: null }, queryParamsHandling: 'merge' });
  }
  setOrdering(val: string) {
    this.router.navigate([], { queryParams: { ordering: val === '-created_at' ? null : val }, queryParamsHandling: 'merge' });
  }
  goToPage(p: number) {
    this.router.navigate([], { queryParams: { page: p === 1 ? null : p }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get totalPages() { return Math.ceil(this.totalCount() / this.pageSize); }

  loadPrompts() {
    this.loading.set(true);
    this.promptService.getPrompts({
      search: this._searchQuery() || undefined,
      category: this.activeCategory(),
      tag: this.activeTag() || undefined,
      ordering: this.ordering(),
      page: this.currentPage(),
    }).subscribe({
      next: res => { this.prompts.set(res.results); this.totalCount.set(res.count); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadHotPrompts() {
    this.promptService.getPrompts({ hot: true, ordering: '-vote_count' }).subscribe(res => {
      this.hotPrompts.set(res.results.slice(0, 6));
    });
  }

  openDetail(prompt: Prompt) { this.router.navigate(['/prompt', prompt.id]); }

  handleAddPrompt() {
    if (!this.auth.isLoggedIn()) this.showAuth = true;
    else this.showAddPrompt = true;
  }

  handleSaveToCollection(prompt: Prompt) {
    if (!this.auth.isLoggedIn()) this.showAuth = true;
    else this.promptToSave.set(prompt);   // ← .set() instead of plain assignment
  }

  onVoteChanged(event: { id: number; vote_count: number }) {
    this.prompts.update(list =>
      list.map(p => p.id === event.id ? { ...p, vote_count: event.vote_count, has_voted: !p.has_voted } : p)
    );
  }

  reload() { this.loadPrompts(); this.loadHotPrompts(); }
}
