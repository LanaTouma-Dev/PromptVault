import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AITool, Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';

const CATEGORY_COLORS: Record<string, string> = {
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  cyan:   'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

@Component({
  selector: 'app-prompt-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md hover:border-primary/30 transition cursor-pointer group"
      (click)="open.emit(prompt())"
    >
      <!-- Header row -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          @if (prompt().category) {
            <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wide {{ catColor() }}">
              {{ prompt().category!.name }}
            </span>
          }
          @if (prompt().is_hot) {
            <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wide bg-red-100 text-red-600">
              🔥 Hot
            </span>
          }
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            class="p-1.5 rounded-lg hover:bg-slate-100"
            title="Save to collection"
            (click)="$event.stopPropagation(); saveToCollection.emit()"
          >
            <span class="material-symbols-outlined text-[18px] text-slate-500 hover:text-brand transition">bookmark_add</span>
          </button>
          <button
            class="p-1.5 rounded-lg hover:bg-slate-100"
            title="Copy prompt"
            (click)="$event.stopPropagation(); doCopy()"
          >
            <span class="material-symbols-outlined text-[18px] text-slate-500">content_copy</span>
          </button>
        </div>
      </div>

      <!-- Title + description -->
      <div>
        <h3 class="font-display font-bold text-slate-900 text-base mb-1 line-clamp-2">{{ prompt().title }}</h3>
        <p class="text-sm text-slate-500 line-clamp-2 leading-relaxed">{{ prompt().description }}</p>
      </div>

      <!-- Variables -->
      @if (prompt().variables.length) {
        <div class="flex flex-wrap gap-1">
          @for (v of prompt().variables.slice(0, 4); track v) {
            <span class="px-2 py-0.5 text-[11px] font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded">
              {{ '{{' + v + '}}' }}
            </span>
          }
          @if (prompt().variables.length > 4) {
            <span class="text-[11px] text-slate-400">+{{ prompt().variables.length - 4 }} more</span>
          }
        </div>
      }

      <!-- Compatible AI Tools -->
      @if (prompt().compatible_tools.length) {
        <div class="flex flex-wrap gap-1">
          @for (tool of prompt().compatible_tools.slice(0, 3); track tool.id) {
            <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border"
                  [ngClass]="toolChipClass(tool.pricing)">
              <span class="material-symbols-outlined" style="font-size:11px;">smart_toy</span>
              {{ tool.name }}
              <span class="opacity-55 text-[10px]">· {{ pricingLabel(tool.pricing) }}</span>
            </span>
          }
          @if (prompt().compatible_tools.length > 3) {
            <span class="text-[11px] text-slate-400">+{{ prompt().compatible_tools.length - 3 }}</span>
          }
        </div>
      }

      <!-- Tags -->
      @if (prompt().tags.length) {
        <div class="flex flex-wrap gap-1" (click)="$event.stopPropagation()">
          @for (tag of prompt().tags.slice(0, 3); track tag.id) {
            <a 
              [routerLink]="['/']" 
              [queryParams]="{ tag: tag.slug }"
              class="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition"
            >
              # {{ tag.name }}
            </a>
          }
          @if (prompt().tags.length > 3) {
            <span class="px-2 py-0.5 text-[11px] text-slate-400 rounded-full bg-slate-50 border border-slate-100">+{{ prompt().tags.length - 3 }}</span>
          }
        </div>
      }

      <!-- Footer: author + stats -->
      <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
        <div class="flex items-center gap-2">
          <div class="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
            {{ initials() }}
          </div>
          <span class="text-xs text-slate-500">{{ authorName() }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-500">
          <button
            class="flex items-center gap-1 hover:text-brand transition"
            [class.text-brand]="prompt().has_voted"
            (click)="$event.stopPropagation(); doVote()"
          >
            <span class="material-symbols-outlined text-[16px]">arrow_upward</span>
            {{ localVoteCount }}
          </button>
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">content_copy</span>
            {{ prompt().copy_count }}
          </span>
        </div>
      </div>
    </div>
  `,
})
export class PromptCardComponent {
  prompt = input.required<Prompt>();
  open = output<Prompt>();
  voteChanged = output<{ id: number; vote_count: number }>();
  saveToCollection = output<void>();

  private promptService = inject(PromptService);
  private auth = inject(AuthService);

  get localVoteCount() { return this.prompt().vote_count; }

  catColor() {
    const color = this.prompt().category?.color ?? 'blue';
    return CATEGORY_COLORS[color] ?? 'bg-slate-100 text-slate-700';
  }

  toolChipClass(pricing: AITool['pricing']): string {
    switch (pricing) {
      case 'free':     return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'freemium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'paid':     return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  pricingLabel(pricing: AITool['pricing']): string {
    switch (pricing) {
      case 'free':     return 'Free';
      case 'freemium': return 'Free tier';
      case 'paid':     return 'Paid';
    }
  }

  initials() {
    const a = this.prompt().author;
    if (a.first_name) return (a.first_name[0] + (a.last_name?.[0] ?? '')).toUpperCase();
    return a.username[0].toUpperCase();
  }

  authorName() {
    const a = this.prompt().author;
    return a.first_name ? `${a.first_name} ${a.last_name}`.trim() : a.username;
  }

  doVote() {
    if (!this.auth.isLoggedIn()) return;
    this.promptService.upvote(this.prompt().id).subscribe(res => {
      this.voteChanged.emit({ id: this.prompt().id, vote_count: res.vote_count });
    });
  }

  doCopy() {
    navigator.clipboard.writeText(this.prompt().content ?? '').then(() => {
      this.promptService.trackCopy(this.prompt().id).subscribe();
    });
  }
}
