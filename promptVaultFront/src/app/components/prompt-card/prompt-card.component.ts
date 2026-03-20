import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AITool, Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';

/* Rotate through 5 colour slots deterministically by string hash */
function colorIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 5;
}

@Component({
  selector: 'app-prompt-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .card:hover {
      border-color: var(--border-mid);
      box-shadow: 0 4px 18px rgba(96,84,232,0.09);
    }
    .cat-badge {
      display: inline-block;
      padding: 2px 9px;
      font-size: 10px;
      font-weight: 700;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--accent-bg);
      color: var(--accent-txt);
    }
    .hot-badge {
      display: inline-block;
      padding: 2px 9px;
      font-size: 10px;
      font-weight: 700;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--hot-bg);
      color: var(--hot);
    }
    .action-btn {
      padding: 5px;
      border-radius: 7px;
      color: var(--text-muted);
      transition: background 0.12s, color 0.12s;
    }
    .action-btn:hover { background: var(--surface2); color: var(--text); }
    .footer-divider {
      border-top: 1px solid var(--border);
      padding-top: 10px;
      margin-top: auto;
    }
    .vote-btn {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; font-weight: 500;
      color: var(--text-muted);
      transition: color 0.12s;
    }
    .vote-btn:hover, .vote-btn.voted { color: var(--accent-txt); }
  `],
  template: `
    <div class="card group" (click)="open.emit(prompt())">

      <!-- Header -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          @if (prompt().category) {
            <span class="cat-badge">{{ prompt().category!.name }}</span>
          }
          @if (prompt().is_hot) {
            <span class="hot-badge">🔥 Hot</span>
          }
        </div>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
          <button class="action-btn" title="Save to collection"
            (click)="$event.stopPropagation(); saveToCollection.emit()">
            <span class="material-symbols-outlined" style="font-size:17px;">bookmark_add</span>
          </button>
          <button class="action-btn" title="Copy prompt"
            (click)="$event.stopPropagation(); doCopy()">
            <span class="material-symbols-outlined" style="font-size:17px;">content_copy</span>
          </button>
        </div>
      </div>

      <!-- Title + description -->
      <div>
        <h3 class="font-display font-bold text-[15px] mb-1 line-clamp-2" style="color:var(--text);">
          {{ prompt().title }}
        </h3>
        <p class="text-[13px] line-clamp-2 leading-relaxed" style="color:var(--text-muted);">
          {{ prompt().description }}
        </p>
      </div>

      <!-- Variable pills — colourful, rotating palette -->
      @if (prompt().variables.length) {
        <div class="flex flex-wrap gap-1.5">
          @for (v of prompt().variables.slice(0, 4); track v) {
            <span class="inline-block px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md border"
                  [style]="paramStyle(v)">
              {{ '{{' + v + '}}' }}
            </span>
          }
          @if (prompt().variables.length > 4) {
            <span class="text-[11px]" style="color:var(--text-muted);">+{{ prompt().variables.length - 4 }} more</span>
          }
        </div>
      }

      <!-- AI tool chips -->
      @if (prompt().compatible_tools.length) {
        <div class="flex flex-wrap gap-1.5">
          @for (tool of prompt().compatible_tools.slice(0, 3); track tool.id) {
            <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border"
                  [ngClass]="toolChipClass(tool.pricing)">
              <span class="material-symbols-outlined" style="font-size:11px;">smart_toy</span>
              {{ tool.name }}
              <span class="opacity-55 text-[10px]">· {{ pricingLabel(tool.pricing) }}</span>
            </span>
          }
          @if (prompt().compatible_tools.length > 3) {
            <span class="text-[11px]" style="color:var(--text-muted);">+{{ prompt().compatible_tools.length - 3 }}</span>
          }
        </div>
      }

      <!-- Tags — colourful, rotating palette -->
      @if (prompt().tags.length) {
        <div class="flex flex-wrap gap-1.5" (click)="$event.stopPropagation()">
          @for (tag of prompt().tags.slice(0, 4); track tag.id) {
            <a [routerLink]="['/']" [queryParams]="{ tag: tag.slug }"
               class="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full transition-opacity hover:opacity-75"
               [style]="tagStyle(tag.name)">
              #{{ tag.name }}
            </a>
          }
          @if (prompt().tags.length > 4) {
            <span class="text-[11px]" style="color:var(--text-muted);">+{{ prompt().tags.length - 4 }}</span>
          }
        </div>
      }

      <!-- Footer -->
      <div class="footer-divider flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
               style="background:var(--accent);">
            {{ initials() }}
          </div>
          <span class="text-[12px]" style="color:var(--text-muted);">{{ authorName() }}</span>
        </div>
        <div class="flex items-center gap-3 text-[12px]">
          <button class="vote-btn" [class.voted]="prompt().has_voted"
            (click)="$event.stopPropagation(); doVote()">
            <span class="material-symbols-outlined" style="font-size:15px;">arrow_upward</span>
            {{ localVoteCount }}
          </button>
          <span class="flex items-center gap-1" style="color:var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size:15px;">content_copy</span>
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

  paramStyle(name: string): string {
    const i = colorIndex(name);
    return `background:var(--param-${i}-bg); color:var(--param-${i}-txt); border-color:var(--param-${i}-bd);`;
  }

  tagStyle(name: string): string {
    const i = colorIndex(name);
    return `background:var(--tag-${i}-bg); color:var(--tag-${i}-txt);`;
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
      case 'free': return 'Free'; case 'freemium': return 'Free tier'; case 'paid': return 'Paid';
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
