import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';
import { SaveToCollectionModalComponent } from '../../components/save-to-collection-modal/save-to-collection-modal.component';

interface Segment { type: 'text' | 'variable'; value: string; }

function parseContent(content: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segs.push({ type: 'text', value: content.slice(last, m.index) });
    segs.push({ type: 'variable', value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < content.length) segs.push({ type: 'text', value: content.slice(last) });
  return segs;
}

@Component({
  selector: 'app-prompt-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, NavbarComponent, SidebarComponent,
            AuthModalComponent, AddPromptModalComponent, SaveToCollectionModalComponent],
  styles: [`
    main { background: var(--bg); }

    .back-btn {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 13px; color: var(--text-muted);
      transition: color 0.12s; cursor: pointer; background: none; border: none; padding: 0;
    }
    .back-btn:hover { color: var(--accent-txt); }

    .cat-badge {
      padding: 3px 10px; font-size: 11px; font-weight: 700;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;
      background: var(--accent-bg); color: var(--accent-txt);
    }
    .hot-badge {
      padding: 3px 10px; font-size: 11px; font-weight: 700;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;
      background: var(--hot-bg); color: var(--hot);
    }
    .panel {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px;
    }
    .stat-box { text-align: center; padding: 14px; background: var(--surface2); border-radius: 9px; }
    .vote-action {
      width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 6px;
      border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer;
      border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all 0.12s;
    }
    .vote-action:hover, .vote-action.voted { border-color: var(--accent); color: var(--accent-txt); background: var(--accent-bg); }
    .var-input {
      width: 100%; padding: 9px 12px; font-size: 13px; border-radius: 9px;
      background: var(--surface2); border: 1px solid var(--border);
      color: var(--text); outline: none; transition: border-color 0.12s, box-shadow 0.12s;
    }
    .var-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
    .var-input::placeholder { color: var(--text-muted); opacity: 0.5; }
    .copy-btn {
      display: inline-flex; align-items: center; gap: 8px;
      height: 40px; padding: 0 22px; border: none; border-radius: 10px;
      font-size: 13px; font-weight: 600; cursor: pointer; color: #fff;
      background: var(--accent); transition: opacity 0.15s;
    }
    .copy-btn:hover { opacity: 0.88; }
    .copy-btn.success { background: #16a34a; }
    .meta-row {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--border);
    }
    .meta-row:last-child { border-bottom: none; }
    .skeleton-line { border-radius: 6px; background: var(--surface2); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  `],
  template: `
    <app-navbar
      (onSearch)="router.navigate(['/'], { queryParams: { q: $event } })"
      (onAddPrompt)="showAddPrompt = true"
      (onLogin)="showAuth = true"
    />
    <app-sidebar [activeCategory]="''" [totalCount]="0" (selectCategory)="router.navigate(['/'])" />

    <main class="ml-56 pt-[52px] min-h-screen">

      @if (loading()) {
        <div class="max-w-6xl mx-auto px-6 py-6 space-y-4">
          <div class="skeleton-line h-3 w-28 mb-2"></div>
          <div class="skeleton-line h-7 w-2/3"></div>
          <div class="skeleton-line h-4 w-1/2 mt-2"></div>
          <div class="grid grid-cols-3 gap-6 mt-6">
            <div class="col-span-2 skeleton-line h-64 rounded-xl"></div>
            <div class="skeleton-line h-64 rounded-xl"></div>
          </div>
        </div>

      } @else if (!prompt()) {
        <div class="flex flex-col items-center justify-center h-96 text-center">
          <span class="material-symbols-outlined text-5xl mb-3" style="color:var(--border-mid);">search_off</span>
          <p class="font-medium" style="color:var(--text-muted);">Prompt not found</p>
          <button (click)="router.navigate(['/'])" class="back-btn mt-4">← Back to Library</button>
        </div>

      } @else {
        <div class="max-w-6xl mx-auto px-6 py-6">

          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-[13px] mb-5" style="color:var(--text-muted);">
            <button class="back-btn" (click)="router.navigate(['/'])">
              <span class="material-symbols-outlined" style="font-size:15px;">arrow_back</span>
              Library
            </button>
            <span>/</span>
            <span class="truncate max-w-xs" style="color:var(--text);">{{ prompt()!.title }}</span>
          </nav>

          <!-- Header -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              @if (prompt()!.category) {
                <span class="cat-badge">{{ prompt()!.category!.name }}</span>
              }
              @if (prompt()!.is_hot) { <span class="hot-badge">🔥 Hot</span> }
              <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wide"
                    style="background:var(--surface2); color:var(--text-muted);">{{ prompt()!.visibility }}</span>
            </div>
            <h1 class="font-display font-extrabold text-[28px] mb-2 leading-tight" style="color:var(--text);">
              {{ prompt()!.title }}
            </h1>
            <p class="text-[15px] leading-relaxed max-w-2xl" style="color:var(--text-muted);">{{ prompt()!.description }}</p>
            <div class="flex items-center gap-5 mt-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                     style="background:var(--accent);">{{ authorInitials() }}</div>
                <div class="leading-none">
                  <p class="text-[13px] font-medium" style="color:var(--text);">{{ authorName() }}</p>
                  <p class="text-[11px]" style="color:var(--text-muted);">{{ prompt()!.updated_at | date:'MMM d, y' }}</p>
                </div>
              </div>
              <div class="h-4 w-px" style="background:var(--border);"></div>
              <button (click)="doVote()" class="flex items-center gap-1.5 text-[13px] font-medium transition"
                [style]="prompt()!.has_voted ? 'color:var(--accent-txt)' : 'color:var(--text-muted)'">
                <span class="material-symbols-outlined" style="font-size:17px;">arrow_upward</span>
                {{ prompt()!.vote_count }} upvotes
              </button>
              <span class="flex items-center gap-1.5 text-[13px]" style="color:var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size:17px;">content_copy</span>
                {{ prompt()!.copy_count }} copies
              </span>
              <button (click)="showSaveToCollection = true"
                class="flex items-center gap-1.5 text-[13px] font-medium transition"
                style="color:var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size:17px;">bookmark_add</span>
                Save
              </button>
            </div>
          </div>

          <!-- Two-column body -->
          <div class="grid grid-cols-3 gap-6">

            <!-- LEFT -->
            <div class="col-span-2 space-y-4">

              <!-- Dark code editor -->
              <div class="rounded-xl overflow-hidden" style="background:#0f1117; border:1px solid #2a2d3a;">
                <div class="flex items-center justify-between px-4 py-2.5" style="background:#1a1d27; border-bottom:1px solid #2a2d3a;">
                  <div class="flex items-center gap-2">
                    <div class="flex gap-1.5">
                      <div class="w-3 h-3 rounded-full" style="background:rgba(239,68,68,0.6);"></div>
                      <div class="w-3 h-3 rounded-full" style="background:rgba(234,179,8,0.6);"></div>
                      <div class="w-3 h-3 rounded-full" style="background:rgba(34,197,94,0.6);"></div>
                    </div>
                    <span class="font-mono text-[10px] tracking-widest uppercase ml-2" style="color:#4b5268;">prompt · execution shell</span>
                  </div>
                  <button (click)="copyFilled()"
                    class="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-semibold transition"
                    [style]="copied() ? 'background:#16a34a; color:#fff;' : 'background:#252836; color:#9ca3af;'">
                    <span class="material-symbols-outlined" style="font-size:13px;">{{ copied() ? 'check' : 'content_copy' }}</span>
                    {{ copied() ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <div class="p-5 font-mono text-[13px] leading-7 min-h-[200px]">
                  @for (seg of segments(); track $index) {
                    @if (seg.type === 'text') {
                      <span style="color:#c9d1d9; white-space:pre-wrap;">{{ seg.value }}</span>
                    } @else {
                      @if (varValues()[seg.value]) {
                        <span class="inline-block px-2 py-0.5 rounded-md font-semibold mx-0.5"
                              style="color:#5eead4; background:rgba(20,184,166,0.15); border:1px solid rgba(20,184,166,0.35);">
                          {{ varValues()[seg.value] }}
                        </span>
                      } @else {
                        <span class="inline-block px-2 py-0.5 rounded-md font-semibold mx-0.5"
                              style="color:#fcd34d; background:rgba(217,119,6,0.15); border:1px solid rgba(217,119,6,0.35);">
                          {{ '{' }}{{ '{' }}{{ seg.value }}{{ '}' }}{{ '}' }}
                        </span>
                      }
                    }
                  }
                </div>
              </div>

              <!-- Variable fill panel -->
              @if (prompt()!.variables.length > 0) {
                <div class="panel">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-display font-semibold text-[15px] flex items-center gap-2" style="color:var(--text);">
                      <span class="material-symbols-outlined text-[19px]" style="color:#d97706;">edit_note</span>
                      Fill in Variables
                      <span class="text-[12px] font-normal" style="color:var(--text-muted);">
                        ({{ filledCount() }}/{{ prompt()!.variables.length }} filled)
                      </span>
                    </h3>
                    @if (filledCount() > 0) {
                      <button (click)="clearVars()" class="text-[12px]" style="color:var(--text-muted);">Clear all</button>
                    }
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    @for (v of prompt()!.variables; track v) {
                      <div>
                        <label class="inline-block font-mono text-[11px] font-semibold px-2.5 py-1 rounded mb-2"
                               style="background:rgba(217,119,6,0.1); color:#b45309; border:1px solid rgba(217,119,6,0.25);">
                          {{ '{' }}{{ '{' }}{{ v }}{{ '}' }}{{ '}' }}
                        </label>
                        <input type="text" [placeholder]="'Enter ' + v + '…'" class="var-input"
                          [value]="varValues()[v] ?? ''"
                          (input)="setVar(v, $any($event.target).value)"/>
                      </div>
                    }
                  </div>
                  <div class="flex items-center gap-3 mt-5 pt-4" style="border-top:1px solid var(--border);">
                    <button (click)="copyFilled()" class="copy-btn" [class.success]="copied()">
                      <span class="material-symbols-outlined" style="font-size:17px;">{{ copied() ? 'check_circle' : 'content_copy' }}</span>
                      {{ copied() ? 'Copied to clipboard!' : 'Copy Filled Prompt' }}
                    </button>
                    @if (filledCount() < prompt()!.variables.length) {
                      <p class="text-[12px]" style="color:var(--text-muted);">
                        {{ prompt()!.variables.length - filledCount() }} still empty
                      </p>
                    }
                  </div>
                </div>
              } @else {
                <div class="flex justify-end">
                  <button (click)="copyFilled()" class="copy-btn" [class.success]="copied()">
                    <span class="material-symbols-outlined" style="font-size:17px;">{{ copied() ? 'check_circle' : 'content_copy' }}</span>
                    {{ copied() ? 'Copied!' : 'Copy Prompt' }}
                  </button>
                </div>
              }
            </div>

            <!-- RIGHT -->
            <div class="space-y-4">
              <div class="panel">
                <p class="text-[10px] font-semibold uppercase tracking-widest mb-4" style="color:var(--text-muted);">Stats</p>
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div class="stat-box">
                    <p class="font-display font-bold text-[24px]" style="color:var(--text);">{{ prompt()!.vote_count }}</p>
                    <p class="text-[11px] mt-0.5" style="color:var(--text-muted);">Upvotes</p>
                  </div>
                  <div class="stat-box">
                    <p class="font-display font-bold text-[24px]" style="color:var(--text);">{{ prompt()!.copy_count }}</p>
                    <p class="text-[11px] mt-0.5" style="color:var(--text-muted);">Copies</p>
                  </div>
                </div>
                <button (click)="doVote()" class="vote-action" [class.voted]="prompt()!.has_voted">
                  <span class="material-symbols-outlined" style="font-size:17px;">arrow_upward</span>
                  {{ prompt()!.has_voted ? 'Voted' : 'Upvote' }}
                </button>
              </div>

              @if (prompt()!.variables.length > 0) {
                <div class="panel">
                  <p class="text-[10px] font-semibold uppercase tracking-widest mb-3" style="color:var(--text-muted);">
                    Variables ({{ prompt()!.variables.length }})
                  </p>
                  <div class="flex flex-wrap gap-2">
                    @for (v of prompt()!.variables; track v) {
                      <span class="px-2 py-0.5 text-[11px] font-mono rounded border"
                            [style]="varValues()[v]
                              ? 'background:rgba(20,184,166,0.08); color:#0d9488; border-color:rgba(20,184,166,0.25);'
                              : 'background:rgba(217,119,6,0.08); color:#b45309; border-color:rgba(217,119,6,0.25);'">
                        {{ '{' }}{{ '{' }}{{ v }}{{ '}' }}{{ '}' }}
                        @if (varValues()[v]) { <span style="color:#0d9488; margin-left:3px;">✓</span> }
                      </span>
                    }
                  </div>
                </div>
              }

              @if (prompt()!.compatible_tools.length) {
                <div class="panel">
                  <p class="text-[10px] font-semibold uppercase tracking-widest mb-3" style="color:var(--text-muted);">Works With</p>
                  <div class="space-y-3">
                    @for (tool of prompt()!.compatible_tools; track tool.id) {
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined" style="font-size:15px; color:var(--text-muted);">smart_toy</span>
                          <div>
                            <p class="text-[13px] font-medium" style="color:var(--text);">{{ tool.name }}</p>
                            @if (tool.provider) {
                              <p class="text-[11px]" style="color:var(--text-muted);">{{ tool.provider }}</p>
                            }
                          </div>
                        </div>
                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide"
                              [ngClass]="toolPricingClass(tool.pricing)">
                          {{ pricingLabel(tool.pricing) }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="panel">
                <p class="text-[10px] font-semibold uppercase tracking-widest mb-3" style="color:var(--text-muted);">Metadata</p>
                @if (prompt()!.category) {
                  <div class="meta-row">
                    <span style="color:var(--text-muted);">Category</span>
                    <span class="font-medium" style="color:var(--text);">{{ prompt()!.category!.name }}</span>
                  </div>
                }
                @if (prompt()!.tags.length > 0) {
                  <div class="meta-row">
                    <span style="color:var(--text-muted);">Tags</span>
                    <div class="flex flex-wrap gap-1 justify-end">
                      @for (tag of prompt()!.tags; track tag.id) {
                        <span class="px-1.5 py-0.5 text-[11px] rounded-full"
                              style="background:var(--surface2); color:var(--text-muted);">#{{ tag.name }}</span>
                      }
                    </div>
                  </div>
                }
                <div class="meta-row">
                  <span style="color:var(--text-muted);">Visibility</span>
                  <span class="font-medium capitalize" style="color:var(--text);">{{ prompt()!.visibility }}</span>
                </div>
                <div class="meta-row">
                  <span style="color:var(--text-muted);">Created</span>
                  <span class="font-medium" style="color:var(--text);">{{ prompt()!.created_at | date:'MMM d, y' }}</span>
                </div>
                <div class="meta-row">
                  <span style="color:var(--text-muted);">Updated</span>
                  <span class="font-medium" style="color:var(--text);">{{ prompt()!.updated_at | date:'MMM d, y' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </main>

    @if (showAuth)      { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt) { <app-add-prompt-modal (close)="showAddPrompt = false" (saved)="showAddPrompt = false" /> }
    @if (showSaveToCollection && prompt()) {
      <app-save-to-collection-modal [prompt]="prompt()!" (close)="showSaveToCollection = false" />
    }
  `,
})
export class PromptDetailComponent implements OnInit {
  router = inject(Router);
  private route         = inject(ActivatedRoute);
  private promptService = inject(PromptService);
  private auth          = inject(AuthService);

  prompt       = signal<Prompt | null>(null);
  loading      = signal(true);
  copied       = signal(false);

  showAuth             = false;
  showAddPrompt        = false;
  showSaveToCollection = false;

  varValues   = signal<Record<string, string>>({});
  segments    = computed<Segment[]>(() => parseContent(this.prompt()?.content ?? ''));
  filledCount = computed(() => Object.values(this.varValues()).filter(v => v.trim() !== '').length);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.promptService.getPrompt(id).subscribe({
      next: (p) => { this.prompt.set(p); this.loading.set(false); },
      error: () => { this.prompt.set(null); this.loading.set(false); },
    });
  }

  setVar(name: string, value: string) { this.varValues.update(m => ({ ...m, [name]: value })); }
  clearVars() { this.varValues.set({}); }

  copyFilled() {
    const content = this.prompt()?.content ?? '';
    const vals    = this.varValues();
    const filled  = content.replace(/\{\{(\w+)\}\}/g, (_, name) => vals[name] ?? `{{${name}}}`);
    navigator.clipboard.writeText(filled).then(() => {
      this.promptService.trackCopy(this.prompt()!.id).subscribe();
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }

  doVote() {
    if (!this.auth.isLoggedIn()) { this.showAuth = true; return; }
    this.promptService.upvote(this.prompt()!.id).subscribe(res => {
      this.prompt.update(p => p ? { ...p, vote_count: res.vote_count, has_voted: res.voted } : p);
    });
  }

  authorInitials() {
    const a = this.prompt()?.author;
    if (!a) return '?';
    if (a.first_name) return (a.first_name[0] + (a.last_name?.[0] ?? '')).toUpperCase();
    return a.username[0].toUpperCase();
  }
  authorName() {
    const a = this.prompt()?.author;
    if (!a) return '';
    return a.first_name ? `${a.first_name} ${a.last_name}`.trim() : a.username;
  }

  toolPricingClass(pricing: 'free' | 'freemium' | 'paid'): string {
    switch (pricing) {
      case 'free':     return 'bg-emerald-100 text-emerald-700';
      case 'freemium': return 'bg-blue-100 text-blue-700';
      case 'paid':     return 'bg-slate-100 text-slate-600';
    }
  }
  pricingLabel(pricing: 'free' | 'freemium' | 'paid'): string {
    switch (pricing) {
      case 'free': return 'Free'; case 'freemium': return 'Free tier'; case 'paid': return 'Paid';
    }
  }
}
