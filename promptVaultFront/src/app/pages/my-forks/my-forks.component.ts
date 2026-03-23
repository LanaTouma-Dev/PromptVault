import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { Prompt } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { AddPromptModalComponent } from '../../components/add-prompt-modal/add-prompt-modal.component';

function colorIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 5;
}

@Component({
  selector: 'app-my-forks',
  standalone: true,
  imports: [CommonModule, DatePipe, NavbarComponent, SidebarComponent, AuthModalComponent, AddPromptModalComponent],
  styles: [`
    main { background: var(--bg); }
    .p-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px 12px 0 0; padding: 18px;
      display: flex; flex-direction: column; gap: 10px;
      cursor: pointer; transition: border-color 0.15s; overflow: hidden;
    }
    .p-card:hover { border-color: var(--border-mid); }
    .fork-origin {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; color: var(--accent-txt);
      background: var(--accent-bg); border: 1px solid var(--border-mid);
      padding: 2px 8px; border-radius: 20px; cursor: pointer;
      transition: opacity 0.12s; align-self: flex-start;
    }
    .fork-origin:hover { opacity: 0.75; }
    .title { font-size: 15px; font-weight: 700; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
    .desc  { font-size: 13px; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .vis-pill { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; font-size: 10px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
    .vis-private { background: var(--hot-bg); color: var(--hot); }
    .vis-shared  { background: rgba(34,197,94,0.1); color: #16a34a; }
    .owner-actions { display: flex; gap: 6px; padding: 8px 12px; background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 12px 12px; }
    .oa-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 0; border-radius: 7px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all 0.12s; }
    .oa-btn:hover           { background: var(--surface2); color: var(--text); }
    .oa-btn.edit:hover      { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--accent); }
    .oa-btn.publish:hover   { background: rgba(34,197,94,0.1); color: #16a34a; border-color: #16a34a; }
    .oa-btn.danger:hover    { background: var(--hot-bg); color: var(--hot); border-color: var(--hot); }
    .oa-btn:disabled        { opacity: 0.4; cursor: not-allowed; }
    .skeleton-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .skeleton-line { border-radius: 6px; background: var(--surface2); animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; text-align: center; }
    .empty-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: var(--accent-bg); margin-bottom: 16px; }
  `],
  template: `
    <app-navbar
      (onSearch)="router.navigate(['/'], { queryParams: { q: $event } })"
      (onAddPrompt)="showAddPrompt = true"
      (onLogin)="showAuth = true"
    />
    <app-sidebar [activeCategory]="''" [totalCount]="0"
      (selectCategory)="router.navigate(['/'], { queryParams: { cat: $event } })"
    />

    <main class="ml-56 pt-[52px] min-h-screen">
      <div class="max-w-5xl mx-auto px-6 py-6">

        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="font-display font-bold text-[22px]" style="color:var(--text);">My Forks</h1>
            <p class="text-[13px] mt-0.5" style="color:var(--text-muted);">
              Prompts you've forked — edit them and publish your own version
            </p>
          </div>
        </div>

        @if (!loading() && forks().length > 0) {
          <div class="flex items-start gap-3 p-4 rounded-xl mb-6"
               style="background:var(--surface2); border:1px solid var(--border);">
            <span class="material-symbols-outlined" style="font-size:19px; color:var(--accent-txt); flex-shrink:0; margin-top:1px;">info</span>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.6;">
              <strong style="color:var(--text);">Forks are private by default.</strong>
              Edit yours, then click <strong style="color:var(--text);">Publish</strong> to share with the community —
              it will show "Forked from [original]" as attribution.
              You can only publish if the <strong style="color:var(--text);">original is public.</strong>
            </p>
          </div>
        }

        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (i of skeletons; track i) {
              <div class="skeleton-card">
                <div class="skeleton-line h-3 w-1/4 mb-3"></div>
                <div class="skeleton-line h-4 w-3/4 mb-2"></div>
                <div class="skeleton-line h-3 w-full mb-1.5"></div>
                <div class="skeleton-line h-3 w-2/3"></div>
              </div>
            }
          </div>
        } @else if (forks().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <span class="material-symbols-outlined text-[28px]" style="color:var(--accent-txt);">fork_right</span>
            </div>
            <p class="font-display font-bold text-[16px] mb-1" style="color:var(--text);">No forks yet</p>
            <p class="text-[13px] mb-5" style="color:var(--text-muted);">
              Find a prompt in the library and fork it to start customizing
            </p>
            <button (click)="router.navigate(['/'])"
              class="flex items-center gap-2 h-9 px-5 text-white text-[13px] font-semibold rounded-lg transition hover:opacity-85"
              style="background:var(--accent);">
              Browse Library
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (p of forks(); track p.id) {
              <div style="display:flex; flex-direction:column;">

                <div class="p-card" (click)="router.navigate(['/prompt', p.id])">

                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="vis-pill" [class]="p.visibility === 'private' ? 'vis-pill vis-private' : 'vis-pill vis-shared'">
                      <span class="material-symbols-outlined" style="font-size:10px;">{{ p.visibility === 'private' ? 'lock' : 'public' }}</span>
                      {{ p.visibility }}
                    </span>
                    @if (p.category) {
                      <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                            style="background:var(--accent-bg); color:var(--accent-txt);">{{ p.category.name }}</span>
                    }
                  </div>

                  @if (p.forked_from) {
                    <div class="fork-origin" (click)="openOriginal($event, p)">
                      <span class="material-symbols-outlined" style="font-size:12px;">fork_right</span>
                      {{ p.forked_from.title }}
                      @if (p.forked_from.author) {
                        <span style="opacity:0.65;"> · {{ p.forked_from.author.username }}</span>
                      }
                    </div>
                  }

                  <p class="title">{{ p.title }}</p>
                  <p class="desc">{{ p.description }}</p>

                  @if (p.variables.length) {
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                      @for (v of p.variables.slice(0, 3); track v) {
                        <span style="padding:2px 8px; font-size:11px; font-family:monospace; font-weight:600; border-radius:5px; border:1px solid;"
                              [style]="paramStyle(v)">{{ '{{' + v + '}}' }}</span>
                      }
                    </div>
                  }

                  <div style="border-top:1px solid var(--border); padding-top:10px; display:flex; align-items:center; justify-content:space-between; font-size:12px; margin-top:auto;">
                    <span style="color:var(--text-muted);">{{ p.updated_at | date:'MMM d, y' }}</span>
                    <div style="display:flex; align-items:center; gap:10px; color:var(--text-muted);">
                      <span style="display:flex; align-items:center; gap:3px;">
                        <span class="material-symbols-outlined" style="font-size:14px;">arrow_upward</span>{{ p.vote_count }}
                      </span>
                      <span style="display:flex; align-items:center; gap:3px;">
                        <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span>{{ p.copy_count }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="owner-actions">
                  <button class="oa-btn edit" (click)="openEdit(p)">
                    <span class="material-symbols-outlined" style="font-size:14px;">edit</span>Edit
                  </button>
                  @if (p.visibility === 'shared') {
                    <button class="oa-btn" disabled>
                      <span class="material-symbols-outlined" style="font-size:14px; color:#16a34a;">check_circle</span>
                      Published
                    </button>
                  } @else {
                    <button class="oa-btn publish" (click)="publish(p)">
                      <span class="material-symbols-outlined" style="font-size:14px;">share</span>Publish
                    </button>
                  }
                  <button class="oa-btn danger" (click)="confirmDelete(p)">
                    <span class="material-symbols-outlined" style="font-size:14px;">delete</span>Delete
                  </button>
                </div>

              </div>
            }
          </div>
        }

      </div>
    </main>

    @if (promptToDelete()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5); backdrop-filter:blur(4px);" (click)="promptToDelete.set(null)">
        <div class="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
             style="background:var(--surface); border:1px solid var(--border);" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto" style="background:var(--hot-bg);">
            <span class="material-symbols-outlined text-[22px]" style="color:var(--hot);">delete</span>
          </div>
          <h3 class="font-display font-bold text-[16px] text-center mb-1" style="color:var(--text);">Delete fork?</h3>
          <p class="text-[13px] text-center mb-5" style="color:var(--text-muted);">
            "{{ promptToDelete()!.title }}" will be permanently deleted. The original is unaffected.
          </p>
          <div class="flex gap-3">
            <button (click)="promptToDelete.set(null)"
              class="flex-1 h-9 rounded-lg text-[13px] font-semibold border transition"
              style="background:transparent; border-color:var(--border); color:var(--text-muted);">Cancel</button>
            <button (click)="doDelete()" [disabled]="deleting()"
              class="flex-1 h-9 rounded-lg text-[13px] font-semibold text-white border-none transition hover:opacity-85 disabled:opacity-50"
              style="background:var(--hot);">{{ deleting() ? 'Deleting…' : 'Delete' }}</button>
          </div>
        </div>
      </div>
    }

    @if (showEditModal && promptToEdit()) {
      <app-add-prompt-modal [promptToEdit]="promptToEdit()" (close)="closeEditModal()" (saved)="reload()" />
    }
    @if (showAuth)      { <app-auth-modal (close)="showAuth = false" /> }
    @if (showAddPrompt) { <app-add-prompt-modal (close)="showAddPrompt = false" (saved)="reload()" /> }
  `,
})
export class MyForksComponent implements OnInit {
  private promptService = inject(PromptService);
  private auth          = inject(AuthService);
  router                = inject(Router);

  forks          = signal<Prompt[]>([]);
  loading        = signal(true);
  promptToDelete = signal<Prompt | null>(null);
  promptToEdit   = signal<Prompt | null>(null);
  deleting       = signal(false);
  skeletons      = Array(6).fill(0);

  showAuth      = false;
  showAddPrompt = false;
  showEditModal = false;

  paramStyle(name: string) {
    const i = colorIndex(name);
    return `background:var(--param-${i}-bg); color:var(--param-${i}-txt); border-color:var(--param-${i}-bd);`;
  }

  ngOnInit() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/']); return; }
    this.loadForks();
  }

  loadForks() {
    this.loading.set(true);
    this.promptService.getMyForks().subscribe({
      next: res => { this.forks.set(res.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openOriginal(e: Event, p: Prompt) {
    e.stopPropagation();
    if (p.forked_from) this.router.navigate(['/prompt', p.forked_from.id]);
  }

  openEdit(p: Prompt) { this.promptToEdit.set(p); this.showEditModal = true; }
  closeEditModal()    { this.showEditModal = false; this.promptToEdit.set(null); }

  publish(p: Prompt) {
    this.promptService.updatePrompt(p.id, { visibility: 'shared' }).subscribe({
      next: updated => {
        this.forks.update(list => list.map(x => x.id === p.id ? { ...x, visibility: updated.visibility } : x));
      },
      error: (err) => {
        const msg = err?.error?.detail ?? 'Could not publish this fork.';
        alert(msg);
      },
    });
  }

  confirmDelete(p: Prompt) { this.promptToDelete.set(p); }

  doDelete() {
    const p = this.promptToDelete();
    if (!p) return;
    this.deleting.set(true);
    this.promptService.deletePrompt(p.id).subscribe({
      next: () => {
        this.forks.update(list => list.filter(x => x.id !== p.id));
        this.promptToDelete.set(null);
        this.deleting.set(false);
      },
      error: () => this.deleting.set(false),
    });
  }

  reload() { this.loadForks(); }
}
