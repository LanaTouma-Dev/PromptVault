import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PromptCardComponent } from '../../components/prompt-card/prompt-card.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';
import { CollectionService } from '../../core/services/collection.service';
import { Prompt } from '../../models/prompt.model';

@Component({
  selector: 'app-collection-detail',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    SidebarComponent,
    PromptCardComponent,
    AuthModalComponent,
    AddPromptModalComponent,
  ],
  template: `
    <app-navbar
      (onSearch)="handleSearch($event)"
      (onAddPrompt)="handleAddPrompt()"
      (onLogin)="showAuth = true"
    />

    <app-sidebar (selectCategory)="goToCategory($event)" (selectTag)="goToTag($event)" />

    <main class="ml-56 pt-[52px] min-h-screen bg-surface">
      <div class="max-w-5xl mx-auto px-6 py-6">
        <!-- Toolbar -->
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="font-display font-bold text-slate-900 text-2xl flex items-center gap-2">
               Collection Prompts
            </h2>
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
            <span class="material-symbols-outlined text-5xl text-slate-300 mb-3">folder_open</span>
            <p class="text-slate-500 font-medium">This collection is empty</p>
            <p class="text-slate-400 text-sm mt-1">Save prompts to this collection to see them here.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (p of prompts(); track p.id) {
              <div class="relative group">
                <app-prompt-card
                  [prompt]="p"
                  (open)="openDetail($event)"
                  (voteChanged)="onVoteChanged($event)"
                />
                <button
                  class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-white/90 rounded-lg border border-slate-200 shadow-sm text-red-600 hover:bg-red-50 hover:border-red-200 transition"
                  title="Remove from collection"
                  (click)="removeFromCollection(p.id)"
                >
                  <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            }
          </div>
        }
      </div>
    </main>

    @if (showAuth) {
      <app-auth-modal (close)="showAuth = false" />
    }
    @if (showAddPrompt) {
      <app-add-prompt-modal (close)="showAddPrompt = false" />
    }
  `,
})
export class CollectionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private collectionService = inject(CollectionService);

  collectionId = signal<number>(0);
  prompts = signal<Prompt[]>([]);
  loading = signal(true);
  skeletons = Array(6).fill(0);

  showAuth = false;
  showAddPrompt = false;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.collectionId.set(+params['id']);
      this.loadPrompts();
    });
  }

  loadPrompts() {
    this.loading.set(true);
    this.collectionService.getCollectionPrompts(this.collectionId()).subscribe({
      next: (res) => {
        this.prompts.set(res.results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  removeFromCollection(promptId: number) {
    this.collectionService.removePrompt(this.collectionId(), promptId).subscribe(() => {
      this.prompts.update(list => list.filter(p => p.id !== promptId));
    });
  }

  openDetail(prompt: Prompt) {
    this.router.navigate(['/prompt', prompt.id]);
  }

  handleSearch(q: string) {
    this.router.navigate(['/'], { queryParams: { q } });
  }

  goToCategory(slug: string) {
    this.router.navigate(['/'], { queryParams: { cat: slug } });
  }

  goToTag(slug: string) {
    this.router.navigate(['/'], { queryParams: { tag: slug } });
  }

  handleAddPrompt() {
    this.showAddPrompt = true;
  }

  onVoteChanged(event: { id: number; vote_count: number }) {
    this.prompts.update(list =>
      list.map(p => p.id === event.id ? { ...p, vote_count: event.vote_count, has_voted: !p.has_voted } : p)
    );
  }
}
