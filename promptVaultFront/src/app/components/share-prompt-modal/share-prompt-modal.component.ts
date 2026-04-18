import { Component, input, output, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromptShare } from '../../models/prompt.model';
import { PromptService } from '../../core/services/prompt.service';

@Component({
  selector: 'app-share-prompt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .overlay { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); }
    .modal { width:100%; max-width:440px; border-radius:16px; padding:24px; background:var(--surface); border:1px solid var(--border); box-shadow:0 24px 64px rgba(0,0,0,0.25); }
    .input-row { display:flex; gap:8px; }
    .share-input { flex:1; padding:9px 13px; font-size:13px; border-radius:9px; background:var(--surface2); border:1px solid var(--border); color:var(--text); outline:none; transition:border-color 0.12s, box-shadow 0.12s; }
    .share-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-bg); }
    .share-input::placeholder { color:var(--text-muted); opacity:0.5; }
    .btn-add { height:38px; padding:0 16px; border-radius:9px; border:none; font-size:13px; font-weight:600; cursor:pointer; color:#fff; background:var(--accent); transition:opacity 0.12s; white-space:nowrap; }
    .btn-add:hover { opacity:0.88; }
    .btn-add:disabled { opacity:0.4; cursor:not-allowed; }
    .share-item { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:9px; background:var(--surface2); border:1px solid var(--border); }
    .btn-revoke { display:flex; align-items:center; gap:4px; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid var(--border); background:transparent; color:var(--text-muted); transition:all 0.12s; }
    .btn-revoke:hover { background:var(--hot-bg); color:var(--hot); border-color:var(--hot); }
    .error-msg { font-size:12px; color:var(--hot); margin-top:6px; }
    .success-msg { font-size:12px; color:#16a34a; margin-top:6px; }
  `],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="font-display font-bold text-[16px]" style="color:var(--text);">Share Prompt</h2>
            <p class="text-[12px] mt-0.5" style="color:var(--text-muted);">Share privately with another user by username</p>
          </div>
          <button (click)="close.emit()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size:20px;">close</span>
          </button>
        </div>

        <div class="input-row mb-2">
          <input
            class="share-input"
            type="text"
            placeholder="Enter username…"
            [(ngModel)]="usernameInput"
            (keydown.enter)="doShare()"
          />
          <button class="btn-add" (click)="doShare()" [disabled]="adding() || !usernameInput.trim()">
            {{ adding() ? 'Adding…' : 'Share' }}
          </button>
        </div>

        @if (errorMsg()) {
          <p class="error-msg">{{ errorMsg() }}</p>
        }
        @if (successMsg()) {
          <p class="success-msg">{{ successMsg() }}</p>
        }

        <div class="mt-5">
          @if (loading()) {
            <p class="text-[13px] text-center py-4" style="color:var(--text-muted);">Loading…</p>
          } @else if (shares().length === 0) {
            <p class="text-[13px] text-center py-4" style="color:var(--text-muted);">Not shared with anyone yet.</p>
          } @else {
            <p class="text-[11px] font-semibold uppercase tracking-widest mb-3" style="color:var(--text-muted);">Shared with</p>
            <div class="space-y-2">
              @for (s of shares(); track s.id) {
                <div class="share-item">
                  <div class="flex items-center gap-2">
                    <div class="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                         style="background:var(--accent);">{{ s.shared_with_username[0].toUpperCase() }}</div>
                    <span class="text-[13px] font-medium" style="color:var(--text);">{{ s.shared_with_username }}</span>
                  </div>
                  <button class="btn-revoke" (click)="doRevoke(s)">
                    <span class="material-symbols-outlined" style="font-size:13px;">person_remove</span>
                    Revoke
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <div class="flex justify-end mt-6 pt-4" style="border-top:1px solid var(--border);">
          <button (click)="close.emit()"
            class="h-9 px-5 rounded-lg text-[13px] font-semibold border transition hover:opacity-80"
            style="background:transparent; border-color:var(--border); color:var(--text-muted);">
            Done
          </button>
        </div>

      </div>
    </div>
  `,
})
export class SharePromptModalComponent implements OnInit {
  promptId = input.required<number>();
  close    = output<void>();

  private promptService = inject(PromptService);

  shares       = signal<PromptShare[]>([]);
  loading      = signal(true);
  adding       = signal(false);
  usernameInput = '';
  errorMsg     = signal('');
  successMsg   = signal('');

  ngOnInit() {
    this.loadShares();
  }

  loadShares() {
    this.loading.set(true);
    this.promptService.listShares(this.promptId()).subscribe({
      next: res => { this.shares.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  doShare() {
    const username = this.usernameInput.trim();
    if (!username) return;
    this.adding.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    this.promptService.sharePrompt(this.promptId(), username).subscribe({
      next: share => {
        this.adding.set(false);
        this.usernameInput = '';
        if (!this.shares().find(s => s.id === share.id)) {
          this.shares.update(list => [...list, share]);
        }
        this.successMsg.set(`Shared with ${share.shared_with_username}`);
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: err => {
        this.adding.set(false);
        this.errorMsg.set(err?.error?.detail ?? 'Something went wrong.');
      },
    });
  }

  doRevoke(share: PromptShare) {
    this.promptService.unsharePrompt(this.promptId(), share.shared_with_id).subscribe({
      next: () => this.shares.update(list => list.filter(s => s.id !== share.id)),
      error: () => {},
    });
  }
}
