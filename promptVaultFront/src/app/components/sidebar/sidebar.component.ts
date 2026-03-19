import { Component, input, output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../models/prompt.model';
import { CategoryService } from '../../core/services/category.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
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

        <!-- Top Technologies -->
        <div class="mt-5 px-2">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Top Technologies</p>
          <div class="flex flex-wrap gap-1.5">
            @for (tag of topTags; track tag) {
              <span class="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-full cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                {{ tag }}
              </span>
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
  totalCount = input<number>(0);
  selectCategory = output<string>();

  private categoryService = inject(CategoryService);
  categories: Category[] = [];
  topTags = ['React', 'TypeScript', 'Python', 'Docker', 'K8s', 'GraphQL', 'PostgreSQL'];

  ngOnInit() {
    this.categoryService.getCategories().subscribe(res => {
      this.categories = res.results;
    });
  }
}
