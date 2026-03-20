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
    <aside class="fixed left-0 top-[52px] w-56 bg-white border-r border-slate-200 flex flex-col"
           style="height: calc(100vh - 52px);">

      <!-- Scrollable nav area -->
      <div class="flex-1 overflow-y-auto py-4 px-3">

        <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 px-2">Knowledge Base</p>

        <!-- All Prompts -->
        <button
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5"
          [class]="activeCategory() === 'all'
            ? 'bg-blue-50 text-primary'
            : 'text-slate-600 hover:bg-slate-100'"
          (click)="selectCategory.emit('all')"
        >
          <span class="material-symbols-outlined text-[20px]">apps</span>
          All Prompts
          <span class="ml-auto text-xs text-slate-400 tabular-nums">{{ totalCount() }}</span>
        </button>

        <!-- Categories -->
        @for (cat of categories; track cat.id) {
          <button
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5"
            [class]="activeCategory() === cat.slug
              ? 'bg-blue-50 text-primary'
              : 'text-slate-600 hover:bg-slate-100'"
            (click)="selectCategory.emit(cat.slug)"
          >
            <span class="material-symbols-outlined text-[20px]">{{ cat.icon }}</span>
            {{ cat.name }}
            <span class="ml-auto text-xs text-slate-400 tabular-nums">{{ cat.prompt_count }}</span>
          </button>
        }

        <!-- My Collections (if logged in) -->
        @if (auth.isLoggedIn()) {
          <div class="mt-6">
            <div class="flex items-center justify-between px-2 mb-2">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">My Collections</p>
            </div>
            
            @for (c of collections(); track c.id) {
              <a
                [routerLink]="['/collection', c.id]"
                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 mt-1 text-slate-600 hover:bg-slate-100"
                routerLinkActive="bg-red-50 text-brand"
              >
                <span class="text-[16px]">{{ c.icon }}</span>
                <span class="truncate">{{ c.name }}</span>
                <span class="ml-auto text-xs text-slate-400 tabular-nums">{{ c.prompt_count }}</span>
              </a>
            }
            
            @if (collections().length === 0) {
              <p class="px-3 py-2 text-xs text-slate-500 italic">No collections yet.</p>
            }
          </div>
        }

        <!-- Top Technologies -->
        <div class="mt-5 px-2">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Popular Tags</p>
          <div class="flex flex-wrap gap-1.5">
            @for (tag of tags; track tag.id) {
              <button
                class="px-2 py-0.5 text-[11px] rounded-full transition-colors font-medium border"
                [class]="activeTag() === tag.slug 
                  ? 'bg-red-50 text-brand border-brand/30' 
                  : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100 hover:border-slate-200'"
                (click)="selectTag.emit(tag.slug)"
              >
                #{{ tag.name }}
              </button>
            }
            @if (tags.length === 0) {
               <span class="text-xs text-slate-400 italic">No tags yet.</span>
            }
          </div>
        </div>

      </div>

      <!-- Footer: Syriatel SDU stamp -->
      <div class="px-4 py-3 border-t border-slate-100">
        <img src="syriatel-logo.png" alt="Syriatel" class="h-5 w-auto object-contain mb-1.5" style="opacity:0.65;" />
        <p class="text-[10px] text-slate-400 leading-snug">
          An initiative by<br/>
          <span class="font-semibold text-slate-500">Software Development Section</span>
        </p>
      </div>

    </aside>
  `,
})
export class SidebarComponent implements OnInit {
  activeCategory = input<string>('all');
  activeTag = input<string | null>(null);
  totalCount = input<number>(0);
  selectCategory = output<string>();
  selectTag = output<string>();

  private categoryService = inject(CategoryService);
  private collectionService = inject(CollectionService);
  private tagService = inject(TagService);
  auth = inject(AuthService);
  
  categories: Category[] = [];
  collections = signal<Collection[]>([]);
  tags: Tag[] = [];

  ngOnInit() {
    this.categoryService.getCategories().subscribe(res => {
      this.categories = res.results;
    });
    
    this.tagService.getTags().subscribe(res => {
      this.tags = res.results;
    });
  }

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.loadCollections();
      } else {
        this.collections.set([]);
      }
    });
  }

  loadCollections() {
    this.collectionService.getMyCollections().subscribe(res => {
      this.collections.set(res.results);
    });
  }
}
