import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { Comment, Prompt } from '../../models/prompt.model';
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

function repLevel(rep: number): { label: string; color: string } {
  if (rep >= 1000) return { label: 'Expert',      color: '#7c6ef7' };
  if (rep >= 500)  return { label: 'Contributor', color: '#16a34a' };
  if (rep >= 100)  return { label: 'Member',      color: '#ea580c' };
  return               { label: 'Newcomer',    color: '#8b89a0' };
}

@Component({
  selector: 'app-prompt-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterModule,
            NavbarComponent, SidebarComponent,
            AuthModalComponent, AddPromptModalComponent, SaveToCollectionModalComponent],
  styles: [`
    main { background: var(--bg); }
    .back-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--text-muted); transition: color 0.12s; cursor: pointer; background: none; border: none; padding: 0; }
    .back-btn:hover { color: var(--accent-txt); }
    .cat-badge { padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--accent-bg); color: var(--accent-txt); }
    .hot-badge { padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--hot-bg); color: var(--hot); }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .stat-box { text-align: center; padding: 14px; background: var(--surface2); border-radius: 9px; }
    .vote-action { width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all 0.12s; }
    .vote-action:hover, .vote-action.voted { border-color: var(--accent); color: var(--accent-txt); background: var(--accent-bg); }
    .var-input { width: 100%; padding: 9px 12px; font-size: 13px; border-radius: 9px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); outline: none; transition: border-color 0.12s, box-shadow 0.12s; }
    .var-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
    .var-input::placeholder { color: var(--text-muted); opacity: 0.5; }
    .copy-btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 22px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; background: var(--accent); transition: opacity 0.15s; }
    .copy-btn:hover { opacity: 0.88; }
    .copy-btn.success { background: #16a34a; }
    .meta-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .meta-row:last-child { border-bottom: none; }
    .skeleton-line { border-radius: 6px; background: var(--surface2); animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Fork origin banner — shown when viewing a forked prompt */
    .fork-origin-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 10px; margin-bottom: 20px;
      background: var(--accent-bg); border: 1px solid var(--border-mid);
      font-size: 13px; color: var(--accent-txt);
    }

    /* "What now" banner — shown on YOUR OWN fresh fork */
    .fork-guide-banner {
      display: flex; gap: 14px; align-items: flex-start;
      padding: 16px 18px; border-radius: 12px; margin-bottom: 20px;
      background: rgba(217,119,6,0.07); border: 1px solid rgba(217,119,6,0.25);
    }
    .fork-guide-step {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: var(--text-muted);
    }
    .fork-guide-step strong { color: var(--text); }
    .fork-step-num {
      width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(217,119,6,0.15); color: #b45309;
      font-size: 11px; font-weight: 700;
    }

    .action-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .action-btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all 0.12s; }
    .action-btn:hover { background: var(--surface2); color: var(--text); border-color: var(--border-mid); }
    .action-btn.fork:hover { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--accent); }
    .action-btn.forked     { background: var(--accent-bg); color: var(--accent-txt); border-color: var(--accent); }
    .action-btn:disabled   { opacity: 0.5; cursor: not-allowed; }
    .rep-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; background: var(--surface2); border: 1px solid var(--border); }
    .toast-bar { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 12px; background: var(--hot-bg); border: 1px solid var(--hot); color: var(--hot); font-size: 14px; font-weight: 500; box-shadow: 0 8px 32px rgba(0,0,0,0.2); animation: toastIn 0.2s cubic-bezier(.22,1,.36,1) both; white-space: nowrap; }
    @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
    .comment-box { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .comment-item { padding: 14px 0; border-bottom: 1px solid var(--border); }
    .comment-item:last-child { border-bottom: none; }
    .reply-item { margin-left: 36px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
    .comment-input { width: 100%; padding: 10px 13px; font-size: 14px; border-radius: 10px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); outline: none; resize: vertical; min-height: 80px; font-family: inherit; transition: border-color 0.12s, box-shadow 0.12s; }
    .comment-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
    .comment-input::placeholder { color: var(--text-muted); opacity: 0.5; }
    .btn-comment { height: 36px; padding: 0 18px; border-radius: 9px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; background: var(--accent); transition: opacity 0.12s; }
    .btn-comment:hover { opacity: 0.88; }
    .btn-comment:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-reply-toggle { background: none; border: none; cursor: pointer; font-size: 12px; color: var(--text-muted); padding: 0; transition: color 0.12s; }
    .btn-reply-toggle:hover { color: var(--accent-txt); }
    .btn-delete-comment { background: none; border: none; cursor: pointer; font-size: 12px; color: var(--text-muted); padding: 0; transition: color 0.12s; }
    .btn-delete-comment:hover { color: var(--hot); }
  `],
  template: `
    <app-navbar
      (onSearch)="router.navigate(['/'], { queryParams: { q: $event } })"
      (onAddPrompt)="showAddPrompt = true"
      (onLogin)="showAuth = true"
    />
    <app-sidebar [activeCategory]="''" [totalCount]="0" (selectCategory)="router.navigate(['/'])" />

    @if (toast()) {
      <div class="toast-bar">
        <span class="material-symbols-outlined" style="font-size:18px;">info</span>
        {{ toast() }}
      </div>
    }

    <main class="ml-56 pt-[52px] min-h-screen">
      @if (loading()) {
        <div class="max-w-6xl mx-auto px-6 py-6 space-y-4">
          <div class="skeleton-line h-3 w-28"></div>
          <div class="skeleton-line h-7 w-2/3 mt-2"></div>
          <div class="skeleton-line h-4 w-1/2 mt-2"></div>
        </div>
      } @else if (!prompt()) {
        <div class="flex flex-col items-center justify-center h-96 text-center">
          <span class="material-symbols-outlined text-5xl mb-3" style="color:var(--border-mid);">search_off</span>
          <p style="color:var(--text-muted);">Prompt not found</p>
          <button (click)="router.navigate(['/'])" class="back-btn mt-4">← Back to Library</button>
        </div>
      } @else {
        <div class="max-w-6xl mx-auto px-6 py-6">

          <nav class="flex items-center gap-2 text-[13px] mb-5" style="color:var(--text-muted);">
            <button class="back-btn" (click)="router.navigate(['/'])">
              <span class="material-symbols-outlined" style="font-size:15px;">arrow_back</span> Library
            </button>
            <span>/</span>
            <span class="truncate max-w-xs" style="color:var(--text);">{{ prompt()!.title }}</span>
          </nav>

          <!-- Forked-from attribution (shown on any fork) -->
          @if (prompt()!.forked_from) {
            <div class="fork-origin-banner">
              <span class="material-symbols-outlined" style="font-size:18px;">fork_right</span>
              <span>Forked from
                <strong class="cursor-pointer hover:underline"
                  (click)="router.navigate(['/prompt', prompt()!.forked_from!.id])">
                  {{ prompt()!.forked_from!.title }}
                </strong>
                @if (prompt()!.forked_from!.author) {
                  <span style="color:var(--text-muted);"> by {{ prompt()!.forked_from!.author!.username }}</span>
                }
              </span>
            </div>
          }

          <!-- "What now" guide — only shown on YOUR OWN fork that is still private -->
          @if (isOwnFresh()) {
            <div class="fork-guide-banner">
              <span class="material-symbols-outlined" style="font-size:22px; color:#b45309; flex-shrink:0; margin-top:1px;">tips_and_updates</span>
              <div>
                <p style="font-size:13px; font-weight:700; color:#b45309; margin-bottom:10px;">
                  This is your private fork — here's what to do next:
                </p>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div class="fork-guide-step">
                    <span class="fork-step-num">1</span>
                    <span>Go to <strong>My Prompts</strong> → find this prompt → click <strong>Edit</strong></span>
                  </div>
                  <div class="fork-guide-step">
                    <span class="fork-step-num">2</span>
                    <span>Modify the content, title, or variables to make it <strong>your own version</strong></span>
                  </div>
                  <div class="fork-guide-step">
                    <span class="fork-step-num">3</span>
                    <span>Change visibility to <strong>Shared</strong> to publish it to the community</span>
                  </div>
                  <div class="fork-guide-step">
                    <span class="fork-step-num">4</span>
                    <span>Your prompt will show <strong>"Forked from [original]"</strong> as attribution</span>
                  </div>
                </div>
                <div style="margin-top:12px;">
                  <button (click)="router.navigate(['/my-prompts'])"
                    style="height:32px; padding:0 14px; border-radius:8px; border:none; font-size:12px; font-weight:600; cursor:pointer; color:#fff; background:#b45309;">
                    Go to My Prompts →
                  </button>
                </div>
              </div>
            </div>
          }

          <div class="mb-6">
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              @if (prompt()!.category) { <span class="cat-badge">{{ prompt()!.category!.name }}</span> }
              @if (prompt()!.is_hot)   { <span class="hot-badge">🔥 Hot</span> }
              <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wide"
                    style="background:var(--surface2); color:var(--text-muted);">{{ prompt()!.visibility === 'shared' ? 'Public' : 'Private' }}</span>
            </div>
            <h1 class="font-display font-extrabold text-[28px] mb-2 leading-tight" style="color:var(--text);">{{ prompt()!.title }}</h1>
            <p class="text-[15px] leading-relaxed max-w-2xl" style="color:var(--text-muted);">{{ prompt()!.description }}</p>

            <div class="flex items-center gap-4 mt-4 flex-wrap">
              <div class="flex items-center gap-2">
                <div class="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                     style="background:var(--accent);">{{ authorInitials() }}</div>
                <div class="leading-none">
                  <p class="text-[13px] font-semibold" style="color:var(--text);">{{ authorName() }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="rep-badge" [style.border-color]="repInfo().color + '44'" [style.color]="repInfo().color">
                      <span class="material-symbols-outlined" style="font-size:11px;">workspace_premium</span>
                      {{ repInfo().label }} · {{ prompt()!.author.reputation }} rep
                    </span>
                    <span class="text-[11px]" style="color:var(--text-muted);">{{ prompt()!.updated_at | date:'MMM d, y' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="action-row mt-4">
              <!-- Hide vote + save on your own prompt -->
              @if (!isOwn()) {
                <button (click)="doVote()" class="action-btn" [class.voted]="prompt()!.has_voted">
                  <span class="material-symbols-outlined" style="font-size:16px;">arrow_upward</span>
                  {{ prompt()!.vote_count }} upvotes
                </button>
                <button class="action-btn" (click)="showSaveToCollection = true">
                  <span class="material-symbols-outlined" style="font-size:16px;">bookmark_add</span>
                  Save
                </button>
              } @else {
                <!-- Just show the count, not a clickable button -->
                <span class="flex items-center gap-1.5 text-[13px]" style="color:var(--text-muted);">
                  <span class="material-symbols-outlined" style="font-size:16px;">arrow_upward</span>
                  {{ prompt()!.vote_count }} upvotes
                </span>
              }

              <!-- Fork: only shown on OTHER people's shared prompts -->
              @if (!isOwn() && prompt()!.visibility === 'shared') {
                <button class="action-btn fork" [class.forked]="justForked()"
                  (click)="doFork()" [disabled]="forking()">
                  <span class="material-symbols-outlined" style="font-size:16px;">fork_right</span>
                  @if (justForked()) { Forked! — opening your copy… }
                  @else if (forking()) { Forking… }
                  @else { Fork · {{ prompt()!.fork_count }} }
                </button>
              } @else {
                <!-- Show fork count as stat only -->
                <span class="flex items-center gap-1.5 text-[13px]" style="color:var(--text-muted);">
                  <span class="material-symbols-outlined" style="font-size:16px;">fork_right</span>
                  {{ prompt()!.fork_count }} forks
                </span>
              }

              <span class="flex items-center gap-1.5 text-[13px]" style="color:var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size:16px;">content_copy</span>
                {{ prompt()!.copy_count }} copies
              </span>
              <span class="flex items-center gap-1.5 text-[13px]" style="color:var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size:16px;">chat_bubble_outline</span>
                {{ comments().length }} comments
              </span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-6">
            <div class="col-span-2 space-y-4">

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
                              style="color:#5eead4; background:rgba(20,184,166,0.15); border:1px solid rgba(20,184,166,0.35);">{{ varValues()[seg.value] }}</span>
                      } @else {
                        <span class="inline-block px-2 py-0.5 rounded-md font-semibold mx-0.5"
                              style="color:#fcd34d; background:rgba(217,119,6,0.15); border:1px solid rgba(217,119,6,0.35);">{{ '{' }}{{ '{' }}{{ seg.value }}{{ '}' }}{{ '}' }}</span>
                      }
                    }
                  }
                </div>
              </div>

              @if (prompt()!.variables.length > 0) {
                <div class="panel">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-display font-semibold text-[15px] flex items-center gap-2" style="color:var(--text);">
                      <span class="material-symbols-outlined text-[19px]" style="color:#d97706;">edit_note</span>
                      Fill in Variables
                      <span class="text-[12px] font-normal" style="color:var(--text-muted);">({{ filledCount() }}/{{ prompt()!.variables.length }})</span>
                    </h3>
                    @if (filledCount() > 0) { <button (click)="clearVars()" class="text-[12px]" style="color:var(--text-muted);">Clear all</button> }
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    @for (v of prompt()!.variables; track v) {
                      <div>
                        <label class="inline-block font-mono text-[11px] font-semibold px-2.5 py-1 rounded mb-2"
                               style="background:rgba(217,119,6,0.1); color:#b45309; border:1px solid rgba(217,119,6,0.25);">{{ '{' }}{{ '{' }}{{ v }}{{ '}' }}{{ '}' }}</label>
                        <input type="text" [placeholder]="'Enter ' + v + '…'" class="var-input"
                          [value]="varValues()[v] ?? ''" (input)="setVar(v, $any($event.target).value)"/>
                      </div>
                    }
                  </div>
                  <div class="flex items-center gap-3 mt-5 pt-4" style="border-top:1px solid var(--border);">
                    <button (click)="copyFilled()" class="copy-btn" [class.success]="copied()">
                      <span class="material-symbols-outlined" style="font-size:17px;">{{ copied() ? 'check_circle' : 'content_copy' }}</span>
                      {{ copied() ? 'Copied!' : 'Copy Filled Prompt' }}
                    </button>
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

              <div class="comment-box">
                <h3 class="font-display font-semibold text-[15px] mb-4 flex items-center gap-2" style="color:var(--text);">
                  <span class="material-symbols-outlined text-[19px]" style="color:var(--accent-txt);">chat_bubble_outline</span>
                  Discussion
                  <span class="text-[13px] font-normal" style="color:var(--text-muted);">{{ comments().length }} comment{{ comments().length !== 1 ? 's' : '' }}</span>
                </h3>
                @if (auth.isLoggedIn()) {
                  <div class="mb-5">
                    <textarea class="comment-input" [(ngModel)]="newCommentBody"
                      placeholder="Share your thoughts, improvements, or use-cases…"></textarea>
                    <div class="flex justify-end mt-2">
                      <button class="btn-comment" (click)="submitComment()"
                        [disabled]="!newCommentBody.trim() || submittingComment()">
                        {{ submittingComment() ? 'Posting…' : 'Post Comment' }}
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="mb-5 p-3 text-center text-[13px]"
                       style="background:var(--surface2); border-radius:10px; color:var(--text-muted);">
                    <button (click)="showAuth = true" style="color:var(--accent-txt); font-weight:600; background:none; border:none; cursor:pointer;">Sign in</button>
                    to join the discussion
                  </div>
                }
                @if (commentsLoading()) {
                  <div class="flex justify-center py-6">
                    <span class="material-symbols-outlined" style="color:var(--text-muted); font-size:22px;">progress_activity</span>
                  </div>
                } @else if (comments().length === 0) {
                  <p class="text-center text-[13px] py-6" style="color:var(--text-muted);">No comments yet. Be the first!</p>
                } @else {
                  @for (c of comments(); track c.id) {
                    <div class="comment-item">
                      <ng-container *ngTemplateOutlet="commentTpl; context: { c: c, depth: 0 }"></ng-container>
                    </div>
                  }
                }
              </div>

            </div>

            <div class="space-y-4">
              <div class="panel">
                <p class="text-[10px] font-semibold uppercase tracking-widest mb-4" style="color:var(--text-muted);">Stats</p>
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div class="stat-box">
                    <p class="font-display font-bold text-[24px]" style="color:var(--text);">{{ prompt()!.vote_count }}</p>
                    <p class="text-[11px] mt-0.5" style="color:var(--text-muted);">Upvotes</p>
                  </div>
                  <div class="stat-box">
                    <p class="font-display font-bold text-[24px]" style="color:var(--text);">{{ prompt()!.fork_count }}</p>
                    <p class="text-[11px] mt-0.5" style="color:var(--text-muted);">Forks</p>
                  </div>
                  <div class="stat-box">
                    <p class="font-display font-bold text-[24px]" style="color:var(--text);">{{ prompt()!.copy_count }}</p>
                    <p class="text-[11px] mt-0.5" style="color:var(--text-muted);">Copies</p>
                  </div>
                  <div class="stat-box">
                    <p class="font-display font-bold text-[24px]" style="color:var(--text);">{{ comments().length }}</p>
                    <p class="text-[11px] mt-0.5" style="color:var(--text-muted);">Comments</p>
                  </div>
                </div>
                @if (!isOwn()) {
                  <button (click)="doVote()" class="vote-action" [class.voted]="prompt()!.has_voted">
                    <span class="material-symbols-outlined" style="font-size:17px;">arrow_upward</span>
                    {{ prompt()!.has_voted ? 'Voted' : 'Upvote' }}
                  </button>
                }
              </div>

              @if (prompt()!.variables.length > 0) {
                <div class="panel">
                  <p class="text-[10px] font-semibold uppercase tracking-widest mb-3" style="color:var(--text-muted);">Variables</p>
                  <div class="flex flex-wrap gap-2">
                    @for (v of prompt()!.variables; track v) {
                      <span class="px-2 py-0.5 text-[11px] font-mono rounded border"
                            [style]="varValues()[v] ? 'background:rgba(20,184,166,0.08); color:#0d9488; border-color:rgba(20,184,166,0.25);' : 'background:rgba(217,119,6,0.08); color:#b45309; border-color:rgba(217,119,6,0.25);'">
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
                          <p class="text-[13px] font-medium" style="color:var(--text);">{{ tool.name }}</p>
                        </div>
                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide" [ngClass]="toolPricingClass(tool.pricing)">{{ pricingLabel(tool.pricing) }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="panel">
                <p class="text-[10px] font-semibold uppercase tracking-widest mb-3" style="color:var(--text-muted);">Metadata</p>
                @if (prompt()!.category) {
                  <div class="meta-row"><span style="color:var(--text-muted);">Category</span><span class="font-medium" style="color:var(--text);">{{ prompt()!.category!.name }}</span></div>
                }
                <div class="meta-row"><span style="color:var(--text-muted);">Visibility</span><span class="font-medium" style="color:var(--text);">{{ prompt()!.visibility === 'shared' ? 'Public' : 'Private' }}</span></div>
                <div class="meta-row"><span style="color:var(--text-muted);">Created</span><span class="font-medium" style="color:var(--text);">{{ prompt()!.created_at | date:'MMM d, y' }}</span></div>
                <div class="meta-row"><span style="color:var(--text-muted);">Updated</span><span class="font-medium" style="color:var(--text);">{{ prompt()!.updated_at | date:'MMM d, y' }}</span></div>
              </div>
            </div>
          </div>
        </div>
      }
    </main>

    <ng-template #commentTpl let-c="c" let-depth="depth">
      <div [style.margin-left]="depth > 0 ? '32px' : '0'" [style.padding-top]="depth > 0 ? '10px' : '0'">
        <div class="flex items-start gap-3">
          <div class="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
               style="background:var(--accent);">{{ c.author.username[0].toUpperCase() }}</div>
          <div style="flex:1; min-width:0;">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="text-[13px] font-semibold" style="color:var(--text);">{{ c.author.username }}</span>
              <span class="rep-badge" [style.color]="repInfoFor(c.author.reputation).color" [style.border-color]="repInfoFor(c.author.reputation).color + '44'">
                <span class="material-symbols-outlined" style="font-size:10px;">workspace_premium</span>
                {{ c.author.reputation }}
              </span>
              <span class="text-[11px]" style="color:var(--text-muted);">{{ c.created_at | date:'MMM d, y' }}</span>
            </div>
            <p class="text-[13px] leading-relaxed" style="color:var(--text);">{{ c.body }}</p>
            <div class="flex items-center gap-3 mt-2">
              @if (auth.isLoggedIn() && depth === 0) {
                <button class="btn-reply-toggle" (click)="toggleReply(c.id)">{{ replyingTo() === c.id ? 'Cancel' : 'Reply' }}</button>
              }
              @if (auth.isLoggedIn() && c.author.id === auth.user()?.id) {
                <button class="btn-delete-comment" (click)="deleteComment(c.id)">Delete</button>
              }
            </div>
            @if (replyingTo() === c.id) {
              <div class="mt-3">
                <textarea class="comment-input" style="min-height:60px;" [(ngModel)]="replyBody" placeholder="Write a reply…"></textarea>
                <div class="flex justify-end mt-2">
                  <button class="btn-comment" (click)="submitReply(c.id)" [disabled]="!replyBody.trim() || submittingComment()">
                    {{ submittingComment() ? 'Posting…' : 'Post Reply' }}
                  </button>
                </div>
              </div>
            }
            @if (c.replies?.length) {
              @for (reply of c.replies; track reply.id) {
                <div class="reply-item">
                  <ng-container *ngTemplateOutlet="commentTpl; context: { c: reply, depth: 1 }"></ng-container>
                </div>
              }
            }
          </div>
        </div>
      </div>
    </ng-template>

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
  auth                  = inject(AuthService);

  prompt     = signal<Prompt | null>(null);
  loading    = signal(true);
  copied     = signal(false);
  forking    = signal(false);
  justForked = signal(false);
  toast      = signal('');

  showAuth             = false;
  showAddPrompt        = false;
  showSaveToCollection = false;

  varValues   = signal<Record<string, string>>({});
  segments    = computed<Segment[]>(() => parseContent(this.prompt()?.content ?? ''));
  filledCount = computed(() => Object.values(this.varValues()).filter(v => v.trim() !== '').length);

  comments          = signal<Comment[]>([]);
  commentsLoading   = signal(false);
  newCommentBody    = '';
  replyBody         = '';
  replyingTo        = signal<number | null>(null);
  submittingComment = signal(false);

  /** True when the logged-in user is the author of this prompt */
  isOwn = computed(() => {
    const userId = this.auth.user()?.id;
    return !!userId && this.prompt()?.author.id === userId;
  });

  /**
   * True when this is your own fork that is still private —
   * i.e. you just forked it and haven't published it yet.
   * Shows the "what now" guide banner.
   */
  isOwnFresh = computed(() =>
    this.isOwn() &&
    !!this.prompt()?.forked_from &&
    this.prompt()?.visibility === 'private'
  );

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.promptService.getPrompt(id).subscribe({
      next: p => { this.prompt.set(p); this.loading.set(false); this.loadComments(id); },
      error: () => { this.prompt.set(null); this.loading.set(false); },
    });
  }

  loadComments(promptId: number) {
    this.commentsLoading.set(true);
    this.promptService.getComments(promptId).subscribe({
      next: res => { this.comments.set(res.results); this.commentsLoading.set(false); },
      error: () => this.commentsLoading.set(false),
    });
  }

  submitComment() {
    const body = this.newCommentBody.trim();
    if (!body) return;
    this.submittingComment.set(true);
    this.promptService.addComment(this.prompt()!.id, body).subscribe({
      next: c => { this.comments.update(l => [...l, c]); this.newCommentBody = ''; this.submittingComment.set(false); },
      error: () => this.submittingComment.set(false),
    });
  }

  submitReply(parentId: number) {
    const body = this.replyBody.trim();
    if (!body) return;
    this.submittingComment.set(true);
    this.promptService.addComment(this.prompt()!.id, body, parentId).subscribe({
      next: reply => {
        this.comments.update(list => list.map(c =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : c
        ));
        this.replyBody = '';
        this.replyingTo.set(null);
        this.submittingComment.set(false);
      },
      error: () => this.submittingComment.set(false),
    });
  }

  deleteComment(commentId: number) {
    this.promptService.deleteComment(commentId).subscribe(() => {
      this.comments.update(list =>
        list.filter(c => c.id !== commentId)
            .map(c => ({ ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }))
      );
    });
  }

  toggleReply(id: number) { this.replyingTo.set(this.replyingTo() === id ? null : id); this.replyBody = ''; }

  showToast(msg: string) { this.toast.set(msg); setTimeout(() => this.toast.set(''), 3500); }

  doFork() {
    if (!this.auth.isLoggedIn()) { this.showAuth = true; return; }
    this.forking.set(true);
    this.promptService.forkPrompt(this.prompt()!.id).subscribe({
      next: forked => {
        this.forking.set(false);
        this.justForked.set(true);
        this.prompt.update(p => p ? { ...p, fork_count: p.fork_count + 1 } : p);
        setTimeout(() => { this.justForked.set(false); this.router.navigate(['/my-prompts'], { queryParams: { forked: forked.id } }); }, 900);
      },
      error: (err) => {
        this.forking.set(false);
        this.showToast(err?.error?.detail ?? 'Could not fork this prompt.');
      },
    });
  }

  setVar(name: string, value: string) { this.varValues.update(m => ({ ...m, [name]: value })); }
  clearVars() { this.varValues.set({}); }

  copyFilled() {
    const filled = (this.prompt()?.content ?? '').replace(
      /\{\{(\w+)\}\}/g, (_, n) => this.varValues()[n] ?? `{{${n}}}`
    );
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

  repInfo()               { return repLevel(this.prompt()?.author.reputation ?? 0); }
  repInfoFor(rep: number) { return repLevel(rep); }

  authorInitials() {
    const a = this.prompt()?.author;
    if (!a) return '?';
    return (a.first_name ? a.first_name[0] + (a.last_name?.[0] ?? '') : a.username[0]).toUpperCase();
  }
  authorName() {
    const a = this.prompt()?.author;
    if (!a) return '';
    return a.first_name ? `${a.first_name} ${a.last_name}`.trim() : a.username;
  }

  toolPricingClass(p: 'free' | 'freemium' | 'paid') {
    return p === 'free' ? 'bg-emerald-100 text-emerald-700' : p === 'freemium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';
  }
  pricingLabel(p: 'free' | 'freemium' | 'paid') {
    return p === 'free' ? 'Free' : p === 'freemium' ? 'Free tier' : 'Paid';
  }
}
