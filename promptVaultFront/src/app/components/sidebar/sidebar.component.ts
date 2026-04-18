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
    /* Active nav link override */
    :host ::ng-deep a.active-nav {
      color: var(--accent-txt) !important;
      border-left-color: var(--accent) !important;
      background: var(--accent-bg) !important;
    }

    /* Shared item base */
    .nav-btn, .nav-link, .my-space-link {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 7px 10px 7px 7px;
      border-left: 3px solid transparent;
      border-radius: 0 8px 8px 0;
      border-top: none; border-right: none; border-bottom: none;
      font-size: 13px; font-weight: 500; cursor: pointer;
      background: transparent; color: var(--text-muted);
      text-decoration: none; text-align: left;
      transition: background 0.15s, color 0.15s, border-color 0.2s, transform 0.15s;
    }

    /* Hover — nudge right, NOT on active */
    .nav-btn:not(.active):hover,
    .nav-link:not(.active-nav):hover,
    .my-space-link:not(.active-nav):hover {
      background: var(--surface2);
      color: var(--text);
      transform: translateX(3px);
    }

    /* Active KB category */
    .nav-btn.active {
      color: var(--accent-txt);
      border-left-color: var(--accent);
      background: var(--accent-bg);
    }

    /* MY SPACE links — bolder */
    .my-space-link { font-weight: 600; }

    /* Count badge */
    .count {
      margin-left: auto; font-size: 11px; font-weight: 500;
      color: var(--text-muted); padding: 1px 7px;
      border-radius: 20px; transition: background 0.15s, color 0.15s;
    }
    .nav-btn.active .count {
      background: var(--accent-bg);
      color: var(--accent-txt);
    }

    .section-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted);
      padding: 0 10px; margin: 18px 0 4px;
    }
    .section-label:first-child { margin-top: 4px; }

    .tag-pill {
      padding: 2px 9px; font-size: 11px; font-weight: 500;
      border-radius: 20px; border: 1px solid var(--border);
      background: var(--surface2); color: var(--text-muted);
      cursor: pointer; transition: all 0.15s;
    }
    .tag-pill:hover  { border-color: var(--border-mid); color: var(--text); transform: translateY(-1px); }
    .tag-pill.active { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--border-mid); }

    /* User profile footer */
    .profile-footer {
      padding: 12px 10px;
      border-top: 1px solid var(--border);
      display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    .profile-avatar {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: #fff;
    }
    .rep-badge {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 600;
      padding: 1px 6px; border-radius: 20px;
      background: var(--accent-bg); color: var(--accent-txt);
      margin-top: 2px;
    }
  `],
  template: `
    <aside class="fixed left-0 top-[44px] w-56 flex flex-col"
           style="height:calc(100vh - 44px); background:var(--surface); border-right:1px solid var(--border);">

      <div class="flex-1 overflow-y-auto py-2 pr-2">

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

          <a routerLink="/my-prompts" routerLinkActive="active-nav" class="my-space-link">
            <span class="material-symbols-outlined" style="font-size:18px;">description</span>
            My Prompts
          </a>
          <a routerLink="/my-forks" routerLinkActive="active-nav" class="my-space-link">
            <span class="material-symbols-outlined" style="font-size:18px;">fork_right</span>
            My Forks
          </a>
          <a routerLink="/shared-with-me" routerLinkActive="active-nav" class="my-space-link">
            <span class="material-symbols-outlined" style="font-size:18px;">group</span>
            Shared with me
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
        <div style="display:flex; flex-wrap:wrap; gap:6px; padding:2px 10px 8px;">
          @for (tag of tags; track tag.id) {
            <button class="tag-pill" [class.active]="activeTag() === tag.slug"
              (click)="selectTag.emit(tag.slug)">
              #{{ tag.name }}
            </button>
          }
          @if (tags.length === 0) {
            <span style="font-size:12px; color:var(--text-muted); font-style:italic; padding: 0 0 4px;">No tags yet.</span>
          }
        </div>

      </div>

      @if (auth.isLoggedIn() && auth.user()) {
        <div class="profile-footer">
          <div class="profile-avatar" [style.background]="avatarBg()">
            {{ auth.user()?.username?.[0]?.toUpperCase() }}
          </div>
          <div style="min-width:0; flex:1;">
            <p style="font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              {{ auth.user()?.username }}
            </p>
            <div class="rep-badge">
              <span class="material-symbols-outlined" style="font-size:10px;">workspace_premium</span>
              {{ auth.user()?.reputation ?? 0 }} rep
            </div>
          </div>
        </div>
      }

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

  avatarBg() {
    const colors = ['#6054e8','#0d9488','#b45309','#be185d','#1d4ed8'];
    const u = this.auth.user()?.username ?? '';
    let h = 0;
    for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) >>> 0;
    return colors[h % 5];
  }
}
