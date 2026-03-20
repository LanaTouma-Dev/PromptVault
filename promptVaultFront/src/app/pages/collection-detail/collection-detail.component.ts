import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PromptCardComponent } from '../../components/prompt-card/prompt-card.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';
import { CollectionService } from '../../core/services/collection.service';
import { Collection, Prompt } from '../../models/prompt.model';

@Component({
  selector: 'app-collection-detail',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SidebarComponent, PromptCardComponent,
            AuthModalComponent, AddPromptModalComponent],
  styles: [`
    main { background: var(--bg); }

    .back-btn {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 13px; color: var(--text-muted);
      transition: color 0.12s; cursor: pointer;
      background: none; border: none; padding: 0; margin-bottom: 8px;
    }
    .back-btn:hover { color: var(--accent-txt); }

    /* ── Stats strip (matches My Prompts) ── */
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

    /* ── Card with remove button ── */
    .card-wrap { position: relative; }
    .remove-btn {
      position: absolute; top: 10px; right: 10px; z-index: 10;
      opacity: 0; padding: 5px; border-radius: 7px;
      border: 1px solid var(--border);
      background: var(--surface); color: var(--text-muted);
      cursor: pointer; transition: all 0.12s;
    }
    .card-wrap:hover .remove-btn { opacity: 1; }
    .remove-btn:hover {
      background: var(--hot-bg); color: var(--hot); border-color: var(--hot);
    }

    /* ── Skeleton ── */
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
    <app-sidebar (selectCategory)="goToCategory($event)" (selectTag)="goToTag($event)" />

    <main class="ml-56 pt-[52px] min-h-screen">
      <div class="max-w-5xl mx-auto px-6 py-6">

        <!-- Back -->
        <button class="back-btn" (click)="router.navigate(['/'])">
          <span class="material-symbols-outlined" style="font-size:15px;">arrow_back</span>
          Library
        </button>

        <!-- Page header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="font-display font-bold text-[22px] flex items-center gap-2"
                style="color:var(--text);">
              <span class="text-[22px]">{{ collection()?.icon ?? '📁' }}</span>
              {{ collection()?.name ?? 'Collection' }}
            </h1>
            @if (collection()?.description) {
              <p class="text-[13px] mt-0.5" style="color:var(--text-muted);">
                {{ collection()!.description }}
              </p>
            }
          </div>
        </div>

        <!-- Stats strip -->
        @if (!loading() && prompts().length > 0) {
          <div class="stats-strip">
            <div class="stat-card">
              <div class="stat-icon">
                <span class="material-symbols-outlined text-[20px]" style="color:var(--accent-txt);">
                  description
                </span>
              </div>
              <div>
                <p class="font-display font-bold text-[22px]" style="color:var(--text);">
                  {{ prompts().length }}
                </p>
                <p class="text-[12px]" style="color:var(--text-muted);">Prompts</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background:rgba(34,197,94,0.1);">
                <span class="material-symbols-outlined text-[20px]" style="color:#16a34a;">arrow_upward</span>
              </div>
              <div>
                <p class="font-display font-bold text-[22px]" style="color:var(--text);">
                  {{ totalVotes() }}
                </p>
                <p class="text-[12px]" style="color:var(--text-muted);">Total votes</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background:rgba(251,146,60,0.1);">
                <span class="material-symbols-outlined text-[20px]" style="color:#ea580c;">content_copy</span>
              </div>
              <div>
                <p class="font-display font-bold text-[22px]" style="color:var(--text);">
                  {{ totalCopies() }}
                </p>
                <p class="text-[12px]" style="color:var(--text-muted);">Total copies</p>
              </div>
            </div>
          </div>
        }

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
        } @else if (prompts().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <span class="material-symbols-outlined text-[28px]" style="color:var(--accent-txt);">
                folder_open
              </span>
            </div>
            <p class="font-display font-bold text-[16px] mb-1" style="color:var(--text);">
              This collection is empty
            </p>
            <p class="text-[13px]" style="color:var(--text-muted);">
              Save prompts to this collection from the library.
            </p>
          </div>

        <!-- Grid -->
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (p of prompts(); track p.id) {
              <div class="card-wrap">
                <app-prompt-card
                  [prompt]="p"
                  (open)="openDetail($event)"
                  (voteChanged)="onVoteChanged($event)"
                />
                <button class="remove-btn" title="Remove from collection"
                  (click)="removeFromCollection(p.id)">
                  <span class="material-symbols-outlined" style="font-size:15px;">delete</span>
                </button>
              </div>
            }
          </div>
        }

      </div>
    </main>

    @if (showAuth)      { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt) { <app-add-prompt-modal (close)="showAddPrompt = false" /> }
  `,
})
export class CollectionDetailComponent implements OnInit {
  private route             = inject(ActivatedRoute);
  router                    = inject(Router);
  private collectionService = inject(CollectionService);

  collectionId = signal<number>(0);
  collection   = signal<Collection | null>(null);
  prompts      = signal<Prompt[]>([]);
  loading      = signal(true);
  skeletons    = Array(6).fill(0);
  showAuth     = false;
  showAddPrompt = false;

  totalVotes()  { return this.prompts().reduce((s, p) => s + p.vote_count, 0); }
  totalCopies() { return this.prompts().reduce((s, p) => s + p.copy_count, 0); }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.collectionId.set(+params['id']);
      this.loadCollection();
      this.loadPrompts();
    });
  }

  loadCollection() {
    this.collectionService.getCollection(this.collectionId()).subscribe({
      next: col => this.collection.set(col),
      error: () => {},
    });
  }

  loadPrompts() {
    this.loading.set(true);
    this.collectionService.getCollectionPrompts(this.collectionId()).subscribe({
      next: res => { this.prompts.set(res.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  removeFromCollection(promptId: number) {
    this.collectionService.removePrompt(this.collectionId(), promptId).subscribe(() => {
      this.prompts.update(list => list.filter(p => p.id !== promptId));
    });
  }

  openDetail(prompt: Prompt)  { this.router.navigate(['/prompt', prompt.id]); }
  goToCategory(slug: string)  { this.router.navigate(['/'], { queryParams: { cat: slug } }); }
  goToTag(slug: string)       { this.router.navigate(['/'], { queryParams: { tag: slug } }); }

  onVoteChanged(event: { id: number; vote_count: number }) {
    this.prompts.update(list =>
      list.map(p => p.id === event.id ? { ...p, vote_count: event.vote_count, has_voted: !p.has_voted } : p)
    );
  }
}
