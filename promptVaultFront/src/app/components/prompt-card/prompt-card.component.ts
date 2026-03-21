import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AITool, Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';

function colorIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 5;
}

function repLevel(rep: number): string {
  if (rep >= 1000) return '#7c6ef7';
  if (rep >= 500)  return '#16a34a';
  if (rep >= 100)  return '#ea580c';
  return '#8b89a0';
}

@Component({
  selector: 'app-prompt-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; }
    .shell { position: relative; border-radius: 12px; }
    .body {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 18px;
      display: flex; flex-direction: column; gap: 10px;
      cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; overflow: hidden;
    }
    .shell:hover .body { border-color: var(--border-mid); box-shadow: 0 4px 18px rgba(96,84,232,0.09); }
    .actions { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; }
    .shell:hover .actions { opacity: 1; }
    .action-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 7px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; transition: all 0.12s; }
    .action-btn:hover { background: var(--surface2); color: var(--text); border-color: var(--border-mid); }
    .action-btn.bm:hover { color: var(--accent-txt); border-color: var(--accent); background: var(--accent-bg); }
    .cat-badge { flex-shrink:0; display: inline-block; padding: 2px 9px; font-size: 10px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--accent-bg); color: var(--accent-txt); }
    .hot-badge { flex-shrink:0; display: inline-block; padding: 2px 9px; font-size: 10px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--hot-bg); color: var(--hot); }
    .fork-badge { flex-shrink:0; display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; font-size: 10px; font-weight: 600; border-radius: 20px; background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); }
    .title { font-size: 15px; font-weight: 700; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
    .desc  { font-size: 13px; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .footer { border-top: 1px solid var(--border); padding-top: 10px; display: flex; align-items: center; justify-content: space-between; }
    .vote-btn { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; color: var(--text-muted); cursor: pointer; background: none; border: none; padding: 0; transition: color 0.12s; }
    .vote-btn:hover, .vote-btn.voted { color: var(--accent-txt); }
    .copy-flash { position: absolute; bottom: 10px; right: 10px; z-index: 20; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #16a34a; color: #fff; pointer-events: none; animation: fadeUp 0.2s ease both; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  `],
  template: `
    <div class="shell">
      <div class="actions">
        <button class="action-btn bm" (click)="doSave()">
          <span class="material-symbols-outlined" style="font-size:16px;">bookmark_add</span>
        </button>
        <button class="action-btn" (click)="doCopy()">
          <span class="material-symbols-outlined" style="font-size:16px;">content_copy</span>
        </button>
      </div>
      @if (justCopied()) { <div class="copy-flash">Copied!</div> }

      <div class="body" (click)="open.emit(prompt())">

        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; padding-right:60px;">
          @if (prompt().category) { <span class="cat-badge">{{ prompt().category!.name }}</span> }
          @if (prompt().is_hot)   { <span class="hot-badge">🔥 Hot</span> }
          @if (prompt().forked_from) {
            <span class="fork-badge">
              <span class="material-symbols-outlined" style="font-size:11px;">fork_right</span>
              fork
            </span>
          }
        </div>

        <div>
          <p class="title">{{ prompt().title }}</p>
          <p class="desc" style="margin-top:4px;">{{ prompt().description }}</p>
        </div>

        @if (prompt().variables.length) {
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            @for (v of prompt().variables.slice(0, 4); track v) {
              <span style="padding:2px 8px; font-size:11px; font-family:monospace; font-weight:600; border-radius:5px; border:1px solid;" [style]="paramStyle(v)">{{ '{{' + v + '}}' }}</span>
            }
            @if (prompt().variables.length > 4) {
              <span style="font-size:11px; color:var(--text-muted);">+{{ prompt().variables.length - 4 }} more</span>
            }
          </div>
        }

        @if (prompt().compatible_tools.length) {
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            @for (tool of prompt().compatible_tools.slice(0, 3); track tool.id) {
              <span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; font-size:11px; font-weight:500; border-radius:20px; border:1px solid;" [ngClass]="toolChipClass(tool.pricing)">
                <span class="material-symbols-outlined" style="font-size:11px;">smart_toy</span>
                {{ tool.name }}<span style="opacity:0.55; font-size:10px;">· {{ pricingLabel(tool.pricing) }}</span>
              </span>
            }
          </div>
        }

        @if (prompt().tags.length) {
          <div style="display:flex; flex-wrap:wrap; gap:6px;" (click)="$event.stopPropagation()">
            @for (tag of prompt().tags.slice(0, 4); track tag.id) {
              <a [routerLink]="['/']" [queryParams]="{ tag: tag.slug }"
                 style="padding:2px 8px; font-size:11px; font-weight:500; border-radius:20px; text-decoration:none; transition:opacity 0.12s;"
                 [style]="tagStyle(tag.name)">#{{ tag.name }}</a>
            }
            @if (prompt().tags.length > 4) {
              <span style="font-size:11px; color:var(--text-muted);">+{{ prompt().tags.length - 4 }}</span>
            }
          </div>
        }

        <div class="footer">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0;"
                 [style.background]="repLevel(prompt().author.reputation)">
              {{ initials() }}
            </div>
            <div style="display:flex; flex-direction:column; line-height:1.2;">
              <span style="font-size:12px; color:var(--text-muted);">{{ authorName() }}</span>
              <span style="font-size:10px; color:var(--text-muted);">{{ prompt().author.reputation }} rep</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px; font-size:12px;">
            <button class="vote-btn" [class.voted]="prompt().has_voted" (click)="$event.stopPropagation(); doVote()">
              <span class="material-symbols-outlined" style="font-size:15px;">arrow_upward</span>{{ prompt().vote_count }}
            </button>
            @if (prompt().fork_count > 0) {
              <span style="display:flex; align-items:center; gap:3px; color:var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size:15px;">fork_right</span>{{ prompt().fork_count }}
              </span>
            }
            <span style="display:flex; align-items:center; gap:4px; color:var(--text-muted);">
              <span class="material-symbols-outlined" style="font-size:15px;">content_copy</span>{{ prompt().copy_count }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PromptCardComponent {
  prompt           = input.required<Prompt>();
  open             = output<Prompt>();
  voteChanged      = output<{ id: number; vote_count: number }>();
  saveToCollection = output<void>();

  private promptService = inject(PromptService);
  private auth          = inject(AuthService);
  justCopied = signal(false);

  doSave() { this.saveToCollection.emit(); }
  repLevel = repLevel;

  paramStyle(name: string) { const i = colorIndex(name); return `background:var(--param-${i}-bg); color:var(--param-${i}-txt); border-color:var(--param-${i}-bd);`; }
  tagStyle(name: string)   { const i = colorIndex(name); return `background:var(--tag-${i}-bg); color:var(--tag-${i}-txt);`; }

  toolChipClass(p: AITool['pricing']) {
    return p === 'free' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p === 'freemium' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200';
  }
  pricingLabel(p: AITool['pricing']) { return p === 'free' ? 'Free' : p === 'freemium' ? 'Free tier' : 'Paid'; }

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
    navigator.clipboard.writeText(this.prompt().content).then(() => {
      this.promptService.trackCopy(this.prompt().id).subscribe();
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 1800);
    });
  }
}
