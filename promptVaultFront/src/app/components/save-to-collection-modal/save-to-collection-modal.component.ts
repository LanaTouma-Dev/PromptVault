import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Prompt, Collection } from '../../models/prompt.model';
import { CollectionService } from '../../core/services/collection.service';

@Component({
  selector: 'app-save-to-collection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
    }
    .sheet {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; box-shadow: 0 40px 100px rgba(0,0,0,0.4);
      width: 100%; max-width: 400px;
      animation: up 200ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes up { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:none} }

    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 20px 14px;
    }
    .close-btn {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      display: flex; align-items: center; justify-content: center;
      background: var(--surface2); color: var(--text-muted);
      cursor: pointer; transition: all 0.12s; flex-shrink: 0;
    }
    .close-btn:hover { color: var(--text); }

    .prompt-label {
      margin: 0 20px 14px; padding: 10px 14px;
      background: var(--surface2); border-radius: 10px;
      border-left: 3px solid var(--accent);
    }

    .divider { height: 1px; background: var(--border); margin: 0 0 12px; }

    .list-wrap {
      max-height: 220px; overflow-y: auto; padding: 0 12px;
    }
    .list-wrap::-webkit-scrollbar { width: 4px; }
    .list-wrap::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 4px; }

    .coll-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 10px; border-radius: 10px; cursor: pointer;
      transition: background 0.12s; border: none; background: transparent;
      width: 100%; text-align: left;
    }
    .coll-row:hover { background: var(--surface2); }
    .coll-row.active { background: var(--accent-bg); }
    .coll-row:disabled { opacity: 0.5; cursor: not-allowed; }

    .coll-icon {
      width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--surface2); border: 1px solid var(--border);
      transition: all 0.12s;
    }
    .coll-row.active .coll-icon { background: var(--accent-bg); border-color: var(--accent); }

    .footer-area { padding: 12px 12px 16px; }

    .new-row { display: flex; gap: 8px; }
    .new-input {
      flex: 1; padding: 8px 11px; font-size: 13px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 9px; color: var(--text); outline: none;
    }
    .new-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
    .new-input::placeholder { color: var(--text-muted); opacity: 0.5; }

    .btn-save {
      padding: 0 14px; height: 36px; font-size: 13px; font-weight: 600;
      border: none; border-radius: 9px; cursor: pointer; color: #fff;
      background: var(--accent); transition: opacity 0.12s; white-space: nowrap;
    }
    .btn-save:hover { opacity: 0.88; }
    .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

    .btn-cancel {
      height: 36px; width: 36px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border); border-radius: 9px; cursor: pointer;
      background: var(--surface2); color: var(--text-muted); transition: all 0.12s;
    }
    .btn-cancel:hover { color: var(--text); }

    .btn-new {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 9px; font-size: 13px; font-weight: 500; border-radius: 9px;
      border: 1px solid var(--border); background: transparent;
      color: var(--text-muted); cursor: pointer; transition: all 0.12s;
    }
    .btn-new:hover { background: var(--surface2); color: var(--text); border-color: var(--border-mid); }

    .toast {
      display: flex; align-items: center; gap: 8px;
      margin: 0 20px 12px; padding: 10px 13px; border-radius: 10px;
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.22);
      color: #16a34a; font-size: 13px; font-weight: 600;
    }

    .spinner { display: flex; justify-content: center; padding: 24px 0; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg) } }

    .empty-msg { text-align: center; padding: 20px 0; font-size: 13px; color: var(--text-muted); }
  `],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">

        <div class="header">
          <div>
            <p class="font-display font-bold text-[16px]" style="color:var(--text);">Save to Collection</p>
            <p class="text-[12px] mt-0.5" style="color:var(--text-muted);">Choose a collection below</p>
          </div>
          <button class="close-btn" (click)="close.emit()">
            <span class="material-symbols-outlined" style="font-size:17px;">close</span>
          </button>
        </div>

        <div class="prompt-label">
          <p style="font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            {{ prompt().title }}
          </p>
          <p style="font-size:11px; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            {{ prompt().description || 'No description' }}
          </p>
        </div>

        @if (justSaved()) {
          <div class="toast" style="margin-bottom:0;">
            <span class="material-symbols-outlined" style="font-size:16px;">check_circle</span>
            Saved to "{{ justSaved() }}"
          </div>
        }

        <div class="divider" style="margin-top:12px;"></div>

        @if (loading()) {
          <div class="spinner">
            <span class="material-symbols-outlined spin" style="font-size:22px; color:var(--text-muted);">progress_activity</span>
          </div>
        } @else {
          <div class="list-wrap">
            @if (collections().length === 0) {
              <p class="empty-msg">No collections yet — create one below.</p>
            }
            @for (c of collections(); track c.id) {
              <button class="coll-row" [class.active]="isIn(c.id)"
                (click)="toggle(c)" [disabled]="saving()">
                <div class="coll-icon">
                  <span class="material-symbols-outlined" style="font-size:18px; color:var(--accent-txt);">
                    {{ isIn(c.id) ? 'bookmark' : 'bookmark_border' }}
                  </span>
                </div>
                <div style="flex:1; min-width:0; text-align:left;">
                  <p style="font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ c.name }}</p>
                  <p style="font-size:11px; color:var(--text-muted);">{{ c.prompt_count }} prompt{{ c.prompt_count !== 1 ? 's' : '' }}</p>
                </div>
                @if (isIn(c.id)) {
                  <span class="material-symbols-outlined" style="font-size:18px; color:var(--accent-txt); flex-shrink:0;">check_circle</span>
                }
              </button>
            }
          </div>
        }

        <div class="footer-area">
          @if (creatingNew()) {
            <div class="new-row">
              <input class="new-input" type="text"
                [(ngModel)]="newName"
                placeholder="Collection name…"
                (keyup.enter)="createCollection()"
                autofocus />
              <button class="btn-save" (click)="createCollection()"
                [disabled]="!newName.trim() || saving()">Save</button>
              <button class="btn-cancel" (click)="creatingNew.set(false)">
                <span class="material-symbols-outlined" style="font-size:16px;">close</span>
              </button>
            </div>
          } @else {
            <button class="btn-new" (click)="creatingNew.set(true)">
              <span class="material-symbols-outlined" style="font-size:16px;">add</span>
              New Collection
            </button>
          }
        </div>

      </div>
    </div>
  `,
})
export class SaveToCollectionModalComponent implements OnInit {
  prompt = input.required<Prompt>();
  close  = output<void>();

  private collectionService = inject(CollectionService);

  collections = signal<Collection[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  creatingNew = signal(false);
  justSaved   = signal('');
  contains    = signal<Set<number>>(new Set());
  newName     = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.collectionService.getMyCollections().subscribe({
      next: res => {
        this.collections.set(res.results);
        const s = new Set<number>();
        res.results.forEach(c => {
          if (c.preview_prompts?.some((p: any) => p.id === this.prompt().id)) s.add(c.id);
        });
        this.contains.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isIn(id: number) { return this.contains().has(id); }

  toggle(c: Collection) {
    if (this.saving()) return;
    this.saving.set(true);
    if (this.isIn(c.id)) {
      this.collectionService.removePrompt(c.id, this.prompt().id).subscribe({
        next: () => { this.contains.update(s => { s.delete(c.id); return new Set(s); }); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    } else {
      this.collectionService.addPrompt(c.id, this.prompt().id).subscribe({
        next: () => {
          this.contains.update(s => { s.add(c.id); return new Set(s); });
          this.saving.set(false);
          this.justSaved.set(c.name);
          setTimeout(() => this.justSaved.set(''), 2500);
        },
        error: () => this.saving.set(false),
      });
    }
  }

  createCollection() {
    const name = this.newName.trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    this.collectionService.createCollection({ name }).subscribe({
      next: newCol => {
        this.collections.update(list => [newCol, ...list]);
        this.newName = '';
        this.creatingNew.set(false);
        this.saving.set(false);
        this.toggle(newCol);
      },
      error: () => this.saving.set(false),
    });
  }
}
