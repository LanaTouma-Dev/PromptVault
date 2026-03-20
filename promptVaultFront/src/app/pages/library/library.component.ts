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
    CommonModule,
    NavbarComponent,
    SidebarComponent,
    PromptCardComponent,
    AuthModalComponent,
    AddPromptModalComponent,
    SaveToCollectionModalComponent,
  ],
  template: `
    <app-navbar
      (onSearch)="handleSearch($event)"
      (onAddPrompt)="handleAddPrompt()"
      (onLogin)="showAuth = true"
    />

    <app-sidebar
      [activeCategory]="activeCategory()"
      [totalCount]="totalCount()"
      (selectCategory)="setCategory($event)"
    />

    <main class="ml-56 pt-[52px] min-h-screen bg-slate-50">
      <div class="max-w-5xl mx-auto px-6 py-6">

        <!-- Welcome Banner -->
        @if (auth.isLoggedIn()) {
          <div class="mb-8 rounded-2xl p-6 relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg border border-slate-700">
            <!-- Decorative circle -->
            <div class="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-brand opacity-20 blur-3xl mix-blend-screen pointer-events-none"></div>
            
            <div class="relative z-10 flex items-center justify-between">
              <div>
                <h1 class="text-2xl font-display font-bold text-white mb-2">Good morning, {{ auth.user()?.first_name || auth.user()?.username }} 👋</h1>
                <p class="text-slate-300 text-sm">Welcome back to the PromptVault. You have {{ totalCount() }} prompts available.</p>
              </div>
              <div class="hidden sm:block">
                 <button (click)="handleAddPrompt()" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-semibold backdrop-blur-md transition flex items-center gap-2 shadow-sm">
                   <span class="material-symbols-outlined text-[18px]">add</span>
                   New Prompt
                 </button>
              </div>
            </div>
          </div>
        }

        <!-- Hot prompts strip -->
        @if (hotPrompts().length && activeCategory() === 'all' && !searchQuery()) {
          <section class="mb-8">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-symbols-outlined text-brand text-[20px]">local_fire_department</span>
              <h2 class="font-display font-bold text-slate-900 text-base">Hot Prompts</h2>
            </div>
            <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              @for (p of hotPrompts(); track p.id) {
                <div
                  class="flex-shrink-0 w-64 bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition"
                  (click)="openDetail(p)"
                >
                  @if (p.category) {
                    <span class="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-red-100 text-red-600 mb-2">
                      {{ p.category.name }}
                    </span>
                  }
                  <p class="font-display font-bold text-sm text-slate-900 line-clamp-2">{{ p.title }}</p>
                  <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ p.description }}</p>
                  <div class="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <span class="material-symbols-outlined text-[14px]">arrow_upward</span> {{ p.vote_count }}
                    <span class="ml-2 material-symbols-outlined text-[14px]">content_copy</span> {{ p.copy_count }}
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Toolbar -->
        <div class="flex items-center justify-between mb-5">
          <h2 class="font-display font-bold text-slate-900 text-lg">
            @if (searchQuery()) {
              Results for "{{ searchQuery() }}"
              <span class="text-slate-400 font-normal text-sm ml-2">({{ totalCount() }} found)</span>
            } @else {
              Prompt Library
              <span class="text-slate-400 font-normal text-sm ml-2">{{ totalCount() }} prompts</span>
            }
          </h2>
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500">Sort by</label>
            <select
              class="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              [value]="ordering()"
              (change)="setOrdering($any($event.target).value)"
            >
              <option value="-created_at">Newest</option>
              <option value="-vote_count">Most Voted</option>
              <option value="-copy_count">Most Copied</option>
            </select>
          </div>
        </div>

        <!-- Grid -->
        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (i of skeletons; track i) {
              <div class="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div class="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
                <div class="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-slate-200 rounded w-full mb-1"></div>
                <div class="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            }
          </div>
        } @else if (prompts().length === 0) {
          <div class="flex flex-col items-center justify-center py-24 text-center">
            <span class="material-symbols-outlined text-5xl text-slate-300 mb-3">search_off</span>
            <p class="text-slate-500 font-medium">No prompts found</p>
            <p class="text-slate-400 text-sm mt-1">Try a different search or category</p>
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

        <!-- Pagination -->
        @if (totalCount() > pageSize && !loading()) {
          <div class="flex items-center justify-center gap-3 mt-8">
            <button
              [disabled]="currentPage() === 1"
              (click)="goToPage(currentPage() - 1)"
              class="h-9 px-4 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span class="text-sm text-slate-500">
              Page {{ currentPage() }} of {{ totalPages }}
            </span>
            <button
              [disabled]="currentPage() === totalPages"
              (click)="goToPage(currentPage() + 1)"
              class="h-9 px-4 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        }
      </div>
    </main>

    <!-- Modals -->
    @if (showAuth) {
      <app-auth-modal (close)="showAuth = false" />
    }
    @if (showAddPrompt) {
      <app-add-prompt-modal (close)="showAddPrompt = false" (saved)="reload()" />
    }
    @if (promptToSave) {
      <app-save-to-collection-modal [prompt]="promptToSave" (close)="promptToSave = null" />
    }
  `,
  styles: [`
    :host { display: block; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
  `],
})
export class LibraryComponent implements OnInit {
  private promptService = inject(PromptService);
  auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  prompts = signal<Prompt[]>([]);
  hotPrompts = signal<Prompt[]>([]);
  totalCount = signal(0);
  loading = signal(true);
  activeCategory = signal('all');
  ordering = signal('-created_at');
  currentPage = signal(1);
  pageSize = 20;
  skeletons = Array(6).fill(0);

  showAuth = false;
  showAddPrompt = false;
  promptToSave: Prompt | null = null;

  private searchSubject = new Subject<string>();
  private _searchQuery = signal('');
  searchQuery = this._searchQuery.asReadonly();

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['cat']) {
        this.activeCategory.set(params['cat']);
      } else {
        this.activeCategory.set('all');
      }
      
      if (params['q'] !== undefined) {
        this._searchQuery.set(params['q']);
      } else {
        this._searchQuery.set('');
      }
      
      this.currentPage.set(1);
      this.loadPrompts();
    });

    this.loadHotPrompts();

    // Debounce search
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
    ).subscribe(q => {
      this.router.navigate([], { 
        queryParams: { q: q || null, cat: this.activeCategory() === 'all' ? null : this.activeCategory() },
        queryParamsHandling: 'merge'
      });
    });
  }

  handleSearch(q: string) {
    this.searchSubject.next(q);
  }

  setCategory(slug: string) {
    this.router.navigate([], { 
      queryParams: { cat: slug === 'all' ? null : slug, q: this._searchQuery() || null },
      queryParamsHandling: 'merge' 
    });
  }

  setOrdering(val: string) {
    this.ordering.set(val);
    this.currentPage.set(1);
    this.loadPrompts();
  }

  goToPage(p: number) {
    this.currentPage.set(p);
    this.loadPrompts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  loadPrompts() {
    this.loading.set(true);
    this.promptService.getPrompts({
      search: this._searchQuery() || undefined,
      category: this.activeCategory(),
      ordering: this.ordering(),
      page: this.currentPage(),
    }).subscribe({
      next: res => {
        this.prompts.set(res.results);
        this.totalCount.set(res.count);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadHotPrompts() {
    this.promptService.getPrompts({ hot: true, ordering: '-vote_count' }).subscribe(res => {
      this.hotPrompts.set(res.results.slice(0, 6));
    });
  }

  openDetail(prompt: Prompt) {
    this.router.navigate(['/prompt', prompt.id]);
  }

  handleAddPrompt() {
    if (!this.auth.isLoggedIn()) {
      this.showAuth = true;
    } else {
      this.showAddPrompt = true;
    }
  }

  handleSaveToCollection(prompt: Prompt) {
    if (!this.auth.isLoggedIn()) {
      this.showAuth = true;
    } else {
      this.promptToSave = prompt;
    }
  }

  onVoteChanged(event: { id: number; vote_count: number }) {
    this.prompts.update(list =>
      list.map(p => p.id === event.id ? { ...p, vote_count: event.vote_count, has_voted: !p.has_voted } : p)
    );
  }

  reload() {
    this.loadPrompts();
    this.loadHotPrompts();
  }
}
