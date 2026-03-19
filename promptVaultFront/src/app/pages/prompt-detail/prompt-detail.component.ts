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

interface Segment { type: 'text' | 'variable'; value: string; }

const CAT_COLORS: Record<string, string> = {
  red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700', purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700', cyan: 'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

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
  imports: [CommonModule, DatePipe, NavbarComponent, SidebarComponent, AuthModalComponent, AddPromptModalComponent],
  template: `
    <app-navbar
      (onSearch)="router.navigate(['/'], { queryParams: { q: $event } })"
      (onAddPrompt)="showAddPrompt = true"
      (onLogin)="showAuth = true"
    />
    <app-sidebar [activeCategory]="''" [totalCount]="0" (selectCategory)="router.navigate(['/'])" />

    <main class="ml-56 pt-[52px] min-h-screen bg-surface">

      @if (loading()) {
        <!-- Loading skeleton -->
        <div class="max-w-6xl mx-auto px-6 py-6 animate-pulse space-y-4">
          <div class="h-4 w-32 bg-slate-200 rounded"></div>
          <div class="h-8 w-2/3 bg-slate-200 rounded"></div>
          <div class="h-4 w-1/2 bg-slate-200 rounded"></div>
          <div class="grid grid-cols-3 gap-6 mt-6">
            <div class="col-span-2 h-64 bg-slate-200 rounded-xl"></div>
            <div class="h-64 bg-slate-200 rounded-xl"></div>
          </div>
        </div>

      } @else if (!prompt()) {
        <div class="flex flex-col items-center justify-center h-96 text-center">
          <span class="material-symbols-outlined text-5xl text-slate-300 mb-3">search_off</span>
          <p class="text-slate-500 font-medium">Prompt not found</p>
          <button (click)="router.navigate(['/'])" class="mt-4 text-sm text-primary hover:underline">← Back to Library</button>
        </div>

      } @else {
        <div class="max-w-6xl mx-auto px-6 py-6">

          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-sm text-slate-400 mb-5">
            <button (click)="router.navigate(['/'])" class="hover:text-primary transition flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              Library
            </button>
            <span>/</span>
            <span class="text-slate-600 truncate max-w-xs">{{ prompt()!.title }}</span>
          </nav>

          <!-- Page header -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              @if (prompt()!.category) {
                <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide {{ catColor() }}">
                  {{ prompt()!.category!.name }}
                </span>
              }
              @if (prompt()!.is_hot) {
                <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide bg-red-100 text-red-600">
                  🔥 Hot
                </span>
              }
              <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                {{ prompt()!.visibility }}
              </span>
            </div>

            <h1 class="font-display font-extrabold text-3xl text-slate-900 mb-2 leading-tight">
              {{ prompt()!.title }}
            </h1>
            <p class="text-slate-500 text-base leading-relaxed max-w-2xl">{{ prompt()!.description }}</p>

            <!-- Author + stats row -->
            <div class="flex items-center gap-5 mt-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                     style="background:#C8102E;">
                  {{ authorInitials() }}
                </div>
                <div class="leading-none">
                  <p class="text-sm font-medium text-slate-800">{{ authorName() }}</p>
                  <p class="text-xs text-slate-400">{{ prompt()!.updated_at | date:'MMM d, y' }}</p>
                </div>
              </div>
              <div class="h-5 w-px bg-slate-200"></div>
              <button
                (click)="doVote()"
                class="flex items-center gap-1.5 text-sm font-medium transition"
                [class]="prompt()!.has_voted ? 'text-brand' : 'text-slate-500 hover:text-brand'"
              >
                <span class="material-symbols-outlined text-[18px]">arrow_upward</span>
                {{ prompt()!.vote_count }} upvotes
              </button>
              <span class="flex items-center gap-1.5 text-sm text-slate-400">
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
                {{ prompt()!.copy_count }} copies
              </span>
            </div>
          </div>

          <!-- Two-column body -->
          <div class="grid grid-cols-3 gap-6">

            <!-- LEFT: Editor + Variable inputs -->
            <div class="col-span-2 space-y-4">

              <!-- Dark code editor -->
              <div class="rounded-xl overflow-hidden border border-slate-700" style="background:#0f1117;">
                <!-- Editor toolbar -->
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/80"
                     style="background:#1a1d27;">
                  <div class="flex items-center gap-2">
                    <div class="flex gap-1.5">
                      <div class="w-3 h-3 rounded-full bg-red-500/70"></div>
                      <div class="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                      <div class="w-3 h-3 rounded-full bg-green-500/70"></div>
                    </div>
                    <span class="text-[11px] text-slate-500 font-mono ml-2 uppercase tracking-widest">prompt · execution shell</span>
                  </div>
                  <button
                    (click)="copyFilled()"
                    class="flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition"
                    [class]="copied() ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
                  >
                    <span class="material-symbols-outlined text-[14px]">{{ copied() ? 'check' : 'content_copy' }}</span>
                    {{ copied() ? 'Copied!' : 'Copy' }}
                  </button>
                </div>

                <!-- Content with highlighted variables -->
                <div class="p-5 font-mono text-sm leading-7 min-h-[200px]">
                  @for (seg of segments(); track $index) {
                    @if (seg.type === 'text') {
                      <span class="text-slate-300 whitespace-pre-wrap">{{ seg.value }}</span>
                    } @else {
                      <!-- Variable chip: filled = teal glow, empty = amber outline -->
                      @if (varValues()[seg.value]) {
                        <span class="inline-block px-2 py-0.5 rounded-md font-semibold text-teal-300 mx-0.5"
                              style="background:rgba(20,184,166,0.15); border:1px solid rgba(20,184,166,0.4);">
                          {{ varValues()[seg.value] }}
                        </span>
                      } @else {
                        <span class="inline-block px-2 py-0.5 rounded-md font-semibold text-amber-300 mx-0.5"
                              style="background:rgba(217,119,6,0.15); border:1px solid rgba(217,119,6,0.4);">
                          {{ '{' }}{{ '{' }}{{ seg.value }}{{ '}' }}{{ '}' }}
                        </span>
                      }
                    }
                  }
                </div>
              </div>

              <!-- Variable fill-in panel -->
              @if (prompt()!.variables.length > 0) {
                <div class="bg-white rounded-xl border border-slate-200 p-5">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-display font-semibold text-slate-900 flex items-center gap-2">
                      <span class="material-symbols-outlined text-amber-500 text-[20px]">edit_note</span>
                      Fill in Variables
                      <span class="text-xs font-normal text-slate-400">({{ filledCount() }}/{{ prompt()!.variables.length }} filled)</span>
                    </h3>
                    @if (filledCount() > 0) {
                      <button
                        (click)="clearVars()"
                        class="text-xs text-slate-400 hover:text-slate-600 transition"
                      >
                        Clear all
                      </button>
                    }
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    @for (v of prompt()!.variables; track v) {
                      <div>
                        <label class="block text-xs font-medium text-slate-500 mb-1.5">
                          <span class="font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {{ '{' }}{{ '{' }}{{ v }}{{ '}' }}{{ '}' }}
                          </span>
                        </label>
                        <input
                          type="text"
                          [placeholder]="'Enter ' + v + '...'"
                          [value]="varValues()[v] ?? ''"
                          (input)="setVar(v, $any($event.target).value)"
                          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                        />
                      </div>
                    }
                  </div>

                  <!-- Copy filled prompt CTA -->
                  <div class="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                    <button
                      (click)="copyFilled()"
                      class="flex items-center gap-2 h-10 px-6 text-white text-sm font-semibold rounded-lg transition hover:opacity-90"
                      [style]="copied() ? 'background:#16a34a;' : 'background:#C8102E;'"
                    >
                      <span class="material-symbols-outlined text-[18px]">{{ copied() ? 'check_circle' : 'content_copy' }}</span>
                      {{ copied() ? 'Copied to clipboard!' : 'Copy Filled Prompt' }}
                    </button>
                    @if (filledCount() < prompt()!.variables.length) {
                      <p class="text-xs text-slate-400">
                        {{ prompt()!.variables.length - filledCount() }} variable(s) still empty — they'll be copied as
                        <span class="font-mono text-amber-600">{{ '{' }}{{ '{' }}name{{ '}' }}{{ '}' }}</span>
                      </p>
                    }
                  </div>
                </div>
              } @else {
                <!-- No variables — just show copy button -->
                <div class="flex justify-end">
                  <button
                    (click)="copyFilled()"
                    class="flex items-center gap-2 h-10 px-6 text-white text-sm font-semibold rounded-lg transition hover:opacity-90"
                    [style]="copied() ? 'background:#16a34a;' : 'background:#C8102E;'"
                  >
                    <span class="material-symbols-outlined text-[18px]">{{ copied() ? 'check_circle' : 'content_copy' }}</span>
                    {{ copied() ? 'Copied!' : 'Copy Prompt' }}
                  </button>
                </div>
              }
            </div>

            <!-- RIGHT: Metadata panel -->
            <div class="space-y-4">

              <!-- Quick stats card -->
              <div class="bg-white rounded-xl border border-slate-200 p-5">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Stats</h3>
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div class="text-center p-3 bg-slate-50 rounded-lg">
                    <p class="font-display font-bold text-2xl text-slate-900">{{ prompt()!.vote_count }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">Upvotes</p>
                  </div>
                  <div class="text-center p-3 bg-slate-50 rounded-lg">
                    <p class="font-display font-bold text-2xl text-slate-900">{{ prompt()!.copy_count }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">Copies</p>
                  </div>
                </div>
                <button
                  (click)="doVote()"
                  class="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold border-2 transition"
                  [class]="prompt()!.has_voted
                    ? 'border-brand text-brand bg-red-50'
                    : 'border-slate-200 text-slate-600 hover:border-brand hover:text-brand'"
                >
                  <span class="material-symbols-outlined text-[18px]">arrow_upward</span>
                  {{ prompt()!.has_voted ? 'Voted' : 'Upvote' }}
                </button>
              </div>

              <!-- Variables summary -->
              @if (prompt()!.variables.length > 0) {
                <div class="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                    Variables ({{ prompt()!.variables.length }})
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    @for (v of prompt()!.variables; track v) {
                      <span
                        class="px-2 py-0.5 text-xs font-mono rounded border transition"
                        [class]="varValues()[v]
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'"
                      >
                        {{ '{' }}{{ '{' }}{{ v }}{{ '}' }}{{ '}' }}
                        @if (varValues()[v]) { <span class="text-teal-400 ml-1">✓</span> }
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Works With -->
              @if (prompt()!.compatible_tools.length) {
                <div class="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Works With</h3>
                  <div class="space-y-2">
                    @for (tool of prompt()!.compatible_tools; track tool.id) {
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-slate-400" style="font-size:16px;">smart_toy</span>
                          <div class="leading-none">
                            <p class="text-sm font-medium text-slate-800">{{ tool.name }}</p>
                            @if (tool.provider) {
                              <p class="text-[11px] text-slate-400">{{ tool.provider }}</p>
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

              <!-- Metadata -->
              <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Metadata</h3>

                @if (prompt()!.category) {
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500">Category</span>
                    <span class="font-medium text-slate-800">{{ prompt()!.category!.name }}</span>
                  </div>
                }

                @if (prompt()!.tags.length > 0) {
                  <div class="flex items-start justify-between text-sm gap-2">
                    <span class="text-slate-500 flex-shrink-0">Tags</span>
                    <div class="flex flex-wrap gap-1 justify-end">
                      @for (tag of prompt()!.tags; track tag.id) {
                        <span class="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">#{{ tag.name }}</span>
                      }
                    </div>
                  </div>
                }

                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-500">Visibility</span>
                  <span class="font-medium text-slate-800 capitalize">{{ prompt()!.visibility }}</span>
                </div>

                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-500">Created</span>
                  <span class="font-medium text-slate-800">{{ prompt()!.created_at | date:'MMM d, y' }}</span>
                </div>

                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-500">Updated</span>
                  <span class="font-medium text-slate-800">{{ prompt()!.updated_at | date:'MMM d, y' }}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      }
    </main>

    @if (showAuth) { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt) { <app-add-prompt-modal (close)="showAddPrompt = false" (saved)="showAddPrompt = false" /> }
  `,
})
export class PromptDetailComponent implements OnInit {
  router      = inject(Router);
  private route        = inject(ActivatedRoute);
  private promptService = inject(PromptService);
  private auth          = inject(AuthService);

  prompt  = signal<Prompt | null>(null);
  loading = signal(true);
  copied  = signal(false);
  showAuth = false;
  showAddPrompt = false;

  // Variable fill-in state
  varValues = signal<Record<string, string>>({});

  // Parse content into text/variable segments — recomputed when prompt loads
  segments = computed<Segment[]>(() => {
    const content = this.prompt()?.content ?? '';
    return parseContent(content);
  });

  filledCount = computed(() =>
    Object.values(this.varValues()).filter(v => v.trim() !== '').length
  );

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.promptService.getPrompt(id).subscribe({
      next: (p) => { this.prompt.set(p); this.loading.set(false); },
      error: () => { this.prompt.set(null); this.loading.set(false); },
    });
  }

  setVar(name: string, value: string) {
    this.varValues.update(m => ({ ...m, [name]: value }));
  }

  clearVars() { this.varValues.set({}); }

  copyFilled() {
    const content = this.prompt()?.content ?? '';
    const vals = this.varValues();
    const filled = content.replace(/\{\{(\w+)\}\}/g, (_, name) => vals[name] ?? `{{${name}}}`);
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

  catColor() {
    const color = this.prompt()?.category?.color ?? 'blue';
    return CAT_COLORS[color] ?? 'bg-slate-100 text-slate-700';
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
      case 'free':     return 'Free';
      case 'freemium': return 'Free tier';
      case 'paid':     return 'Paid';
    }
  }
}
