import { Component, input, output, inject, signal, OnInit } from '@angular/core';
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
  styles: [`
    :host ::ng-deep a.active-nav {
      background: var(--accent-bg) !important;
      color: var(--accent-txt) !important;
    }
    .nav-btn {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 7px 10px; border-radius: 8px; border: none;
      font-size: 13px; font-weight: 500; cursor: pointer;
      background: transparent; color: var(--text-muted);
      transition: background 0.12s, color 0.12s; text-align: left;
    }
    .nav-btn:hover  { background: var(--surface2); color: var(--text); }
    .nav-btn.active { background: var(--accent-bg); color: var(--accent-txt); }
    .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 10px; border-radius: 8px;
      font-size: 13px; font-weight: 500; cursor: pointer;
      color: var(--text-muted); text-decoration: none;
      transition: background 0.12s, color 0.12s;
    }
    .nav-link:hover { background: var(--surface2); color: var(--text); }
    .section-label {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--text-muted);
      padding: 0 10px; margin: 16px 0 4px;
    }
    .section-label:first-child { margin-top: 0; }
    .count {
      margin-left: auto; font-size: 11px; font-weight: 400;
      color: var(--text-muted); tabular-nums: true;
    }
    .tag-pill {
      padding: 2px 9px; font-size: 11px; font-weight: 500;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface2); color: var(--text-muted);
      cursor: pointer; transition: all 0.12s;
    }
    .tag-pill:hover  { border-color: var(--border-mid); color: var(--text); }
    .tag-pill.active { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--border-mid); }
  `],
  template: `
    <aside class="fixed left-0 top-[52px] w-56 flex flex-col"
           style="height:calc(100vh - 52px); background:var(--surface); border-right:1px solid var(--border);">

      <div class="flex-1 overflow-y-auto py-3 px-2">

        <p class="section-label">Knowledge Base</p>

        <button class="nav-btn" [class.active]="activeCategory() === 'all'"
          (click)="selectCategory.emit('all')">
          <span class="material-symbols-outlined" style="font-size:18px;">apps</span>
          All Prompts
          <span class="count">{{ totalCount() }}</span>
        </button>

        @for (cat of categories; track cat.id) {
          <button class="nav-btn" [class.active]="activeCategory() === cat.slug"
            (click)="selectCategory.emit(cat.slug)">
            <span class="material-symbols-outlined" style="font-size:18px;">{{ cat.icon }}</span>
            {{ cat.name }}
            <span class="count">{{ cat.prompt_count }}</span>
          </button>
        }

        @if (auth.isLoggedIn()) {
          <p class="section-label">My Space</p>

          <a routerLink="/my-prompts" routerLinkActive="active-nav" class="nav-link">
            <span class="material-symbols-outlined" style="font-size:18px;">lock</span>
            My Prompts
          </a>

          @if (collections().length > 0) {
            <p class="section-label">Collections</p>

            @for (c of collections(); track c.id) {
              <a [routerLink]="['/collection', c.id]" routerLinkActive="active-nav" class="nav-link">
                <span class="material-symbols-outlined" style="font-size:18px;">bookmark</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ c.name }}</span>
                <span class="count">{{ c.prompt_count }}</span>
              </a>
            }
          }
        }

        <p class="section-label">Popular Tags</p>
        <div style="display:flex; flex-wrap:wrap; gap:6px; padding:2px 2px 4px;">
          @for (tag of tags; track tag.id) {
            <button class="tag-pill" [class.active]="activeTag() === tag.slug"
              (click)="selectTag.emit(tag.slug)">
              #{{ tag.name }}
            </button>
          }
          @if (tags.length === 0) {
            <span style="font-size:12px; color:var(--text-muted); font-style:italic;">No tags yet.</span>
          }
        </div>

      </div>
    </aside>
  `,
})
export class SidebarComponent implements OnInit {
  activeCategory = input<string>('all');
  activeTag      = input<string | null>(null);
  totalCount     = input<number>(0);
  selectCategory = output<string>();
  selectTag      = output<string>();

  private categoryService   = inject(CategoryService);
  private collectionService = inject(CollectionService);
  private tagService        = inject(TagService);
  auth = inject(AuthService);

  categories:  Category[]   = [];
  collections  = signal<Collection[]>([]);
  tags:        Tag[]        = [];

  constructor() {
    import('@angular/core').then(({ effect }) => {});
  }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(res => { this.categories = res.results; });
    this.tagService.getTags().subscribe(res => { this.tags = res.results; });
    if (this.auth.isLoggedIn()) this.loadCollections();
  }

  loadCollections() {
    this.collectionService.getMyCollections().subscribe(res => {
      this.collections.set(res.results);
    });
  }
}
