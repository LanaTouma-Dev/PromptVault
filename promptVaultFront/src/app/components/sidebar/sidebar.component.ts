import { Component, input, output, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Category, Collection, Tag } from '../../models/prompt.model';
import { CategoryService } from '../../core/services/category.service';
import { CollectionService } from '../../core/services/collection.service';
import { TagService } from '../../core/services/tag.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="fixed left-0 top-[52px] w-56 flex flex-col"
           style="height:calc(100vh - 52px); background:var(--surface);
                  border-right:1px solid var(--border);">

      <div class="flex-1 overflow-y-auto py-4 px-3">

        <!-- Knowledge Base -->
        <p class="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
           style="color:var(--text-muted);">Knowledge Base</p>

        <button
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]
                 font-medium transition mb-0.5"
          [style]="activeCategory() === 'all'
            ? 'background:var(--accent-bg); color:var(--accent-txt);'
            : 'background:transparent; color:var(--text-muted);'"
          (click)="selectCategory.emit('all')"
        >
          <span class="material-symbols-outlined text-[19px]">apps</span>
          All Prompts
          <span class="ml-auto text-[11px] tabular-nums" style="color:var(--text-muted);">
            {{ totalCount() }}
          </span>
        </button>

        @for (cat of categories; track cat.id) {
          <button
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]
                   font-medium transition mb-0.5"
            [style]="activeCategory() === cat.slug
              ? 'background:var(--accent-bg); color:var(--accent-txt);'
              : 'background:transparent; color:var(--text-muted);'"
            (click)="selectCategory.emit(cat.slug)"
          >
            <span class="material-symbols-outlined text-[19px]">{{ cat.icon }}</span>
            {{ cat.name }}
            <span class="ml-auto text-[11px] tabular-nums" style="color:var(--text-muted);">
              {{ cat.prompt_count }}
            </span>
          </button>
        }

        <!-- My Space (logged-in only) -->
        @if (auth.isLoggedIn()) {
          <div class="mt-5">
            <p class="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
               style="color:var(--text-muted);">My Space</p>

            <!-- My Private Prompts -->
            <a routerLink="/my-prompts"
               routerLinkActive="active-nav"
               class="nav-link w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                      text-[13px] font-medium transition mb-0.5"
               style="color:var(--text-muted); text-decoration:none;"
            >
              <span class="material-symbols-outlined text-[19px]">lock</span>
              My Prompts
            </a>

            <!-- Collections -->
            @for (c of collections(); track c.id) {
              <a
                [routerLink]="['/collection', c.id]"
                routerLinkActive="active-nav"
                class="nav-link w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                       text-[13px] font-medium transition mb-0.5"
                style="color:var(--text-muted); text-decoration:none;"
              >
                <span class="text-[15px]">{{ c.icon }}</span>
                <span class="truncate">{{ c.name }}</span>
                <span class="ml-auto text-[11px] tabular-nums" style="color:var(--text-muted);">
                  {{ c.prompt_count }}
                </span>
              </a>
            }

            @if (collections().length === 0) {
              <p class="px-3 py-2 text-[12px] italic" style="color:var(--text-muted);">
                No collections yet.
              </p>
            }
          </div>
        }

        <!-- Popular Tags -->
        <div class="mt-5 px-1">
          <p class="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
             style="color:var(--text-muted);">Popular Tags</p>
          <div class="flex flex-wrap gap-1.5">
            @for (tag of tags; track tag.id) {
              <button
                class="px-2 py-0.5 text-[11px] rounded-full transition font-medium border"
                [style]="activeTag() === tag.slug
                  ? 'background:var(--accent-bg); color:var(--accent-txt); border-color:var(--border-mid);'
                  : 'background:var(--surface2); color:var(--text-muted); border-color:var(--border);'"
                (click)="selectTag.emit(tag.slug)"
              >
                #{{ tag.name }}
              </button>
            }
            @if (tags.length === 0) {
              <span class="text-[12px] italic" style="color:var(--text-muted);">No tags yet.</span>
            }
          </div>
        </div>

      </div>
    </aside>

    <!-- Active nav link styling injected globally via host -->
  `,
  styles: [`
    :host ::ng-deep .active-nav {
      background: var(--accent-bg) !important;
      color: var(--accent-txt) !important;
    }
  `],
})
export class SidebarComponent implements OnInit {
  activeCategory = input<string>('all');
  activeTag      = input<string | null>(null);
  totalCount     = input<number>(0);
  selectCategory = output<string>();
  selectTag      = output<string>();

  private categoryService  = inject(CategoryService);
  private collectionService = inject(CollectionService);
  private tagService       = inject(TagService);
  auth = inject(AuthService);

  categories: Category[] = [];
  collections = signal<Collection[]>([]);
  tags: Tag[] = [];

  ngOnInit() {
    this.categoryService.getCategories().subscribe(res => { this.categories = res.results; });
    this.tagService.getTags().subscribe(res => { this.tags = res.results; });
  }

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) this.loadCollections();
      else this.collections.set([]);
    });
  }

  loadCollections() {
    this.collectionService.getMyCollections().subscribe(res => {
      this.collections.set(res.results);
    });
  }
}
