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
      position: fixed; inset: 0; z-index: 60;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
      background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
    }
    .sheet {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; box-shadow: 0 24px 64px rgba(0,0,0,0.2);
      width: 100%; max-width: 360px; overflow: hidden;
      animation: sheetIn 220ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes sheetIn {
      from { opacity: 0; transform: translateY(16px) scale(.97) }
      to   { opacity: 1; transform: translateY(0) scale(1) }
    }
    .sheet-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .collection-row {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: 11px 14px; border-radius: 9px; text-align: left;
      border: 1px solid var(--border); background: transparent;
      cursor: pointer; transition: border-color 0.12s, background 0.12s;
    }
    .collection-row:hover { border-color: var(--border-mid); background: var(--surface2); }
    .collection-row.selected { border-color: var(--accent); background: var(--accent-bg); }
    .success-banner {
      margin: 12px 20px 0;
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
      color: #16a34a; border-radius: 8px; padding: 9px 13px;
      font-size: 13px; font-weight: 600; display: flex; align-items: center; gap-8px;
    }
    .new-input {
      flex: 1; padding: 8px 12px; font-size: 13px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text); outline: none;
      transition: border-color 0.12s;
    }
    .new-input:focus { border-color: var(--accent); }
    .new-input::placeholder { color: var(--text-muted); opacity: 0.5; }
    .btn-save {
      padding: 8px 14px; font-size: 13px; font-weight: 600; border: none;
      border-radius: 8px; cursor: pointer; color: #fff;
      background: var(--accent); transition: opacity 0.12s;
    }
    .btn-save:hover { opacity: 0.88; }
    .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-new {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px; font-size: 13px; font-weight: 600; border-radius: 9px;
      border: 1px solid var(--border); background: var(--surface2);
      color: var(--text-muted); cursor: pointer; transition: all 0.12s;
    }
    .btn-new:hover { border-color: var(--border-mid); color: var(--text); }
  `],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">

        <div class="sheet-header">
          <h3 class="font-display font-bold text-[15px]" style="color:var(--text);">Save to Collection</h3>
          <button (click)="close.emit()" style="color:var(--text-muted);">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        @if (justSavedCollection()) {
          <div class="success-banner">
            <span class="material-symbols-outlined text-[17px] mr-2">check_circle</span>
            Saved to {{ justSavedCollection() }}
          </div>
        }

        <div class="p-4">

          <!-- Prompt preview -->
          <div class="flex gap-3 items-start p-3 rounded-10 mb-4"
               style="background:var(--surface2); border:1px solid var(--border); border-radius:10px;">
            <span class="material-symbols-outlined text-[18px] mt-0.5" style="color:var(--accent-txt);">description</span>
            <div>
              <p class="text-[13px] font-semibold line-clamp-1" style="color:var(--text);">{{ prompt().title }}</p>
              <p class="text-[12px] line-clamp-1 mt-0.5" style="color:var(--text-muted);">{{ prompt().description }}</p>
            </div>
          </div>

          @if (loading()) {
            <div class="flex justify-center py-5">
              <span class="material-symbols-outlined animate-spin" style="color:var(--border-mid);">progress_activity</span>
            </div>
          } @else {
            <div class="space-y-2 mb-4 max-h-44 overflow-y-auto pr-0.5">
              @for (c of collections(); track c.id) {
                <button class="collection-row" [class.selected]="isPromptInCollection(c.id)"
                  (click)="toggleCollection(c)" [disabled]="saving()">
                  <div class="flex items-center gap-3">
                    <span class="text-[18px]">{{ c.icon }}</span>
                    <div class="text-left">
                      <p class="text-[13px] font-semibold" style="color:var(--text);">{{ c.name }}</p>
                      <p class="text-[11px]" style="color:var(--text-muted);">{{ c.prompt_count }} prompts</p>
                    </div>
                  </div>
                  @if (isPromptInCollection(c.id)) {
                    <span class="material-symbols-outlined text-[19px]" style="color:var(--accent-txt);">check_circle</span>
                  }
                </button>
              }
              @if (collections().length === 0) {
                <p class="text-[13px] text-center py-3" style="color:var(--text-muted);">No collections yet.</p>
              }
            </div>
          }

          <div style="border-top:1px solid var(--border); padding-top:14px;">
            @if (creatingNew()) {
              <div class="flex gap-2">
                <input type="text" [(ngModel)]="newCollectionName" placeholder="Collection name…"
                  class="new-input" (keyup.enter)="createCollection()" />
                <button (click)="createCollection()" class="btn-save"
                  [disabled]="!newCollectionName.trim() || saving()">Save</button>
                <button (click)="creatingNew.set(false)"
                  class="px-3 rounded-8 text-[12px] font-medium"
                  style="background:var(--surface2); color:var(--text-muted); border:1px solid var(--border); border-radius:8px;">
                  ✕
                </button>
              </div>
            } @else {
              <button (click)="creatingNew.set(true)" class="btn-new">
                <span class="material-symbols-outlined text-[17px]">add</span>
                New Collection
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SaveToCollectionModalComponent implements OnInit {
  prompt = input.required<Prompt>();
  close = output<void>();

  private collectionService = inject(CollectionService);

  collections = signal<Collection[]>([]);
  loading = signal(true);
  saving = signal(false);
  creatingNew = signal(false);
  newCollectionName = '';
  justSavedCollection = signal('');
  collectionContains = signal<Set<number>>(new Set());

  ngOnInit() { this.loadCollections(); }

  loadCollections() {
    this.loading.set(true);
    this.collectionService.getMyCollections().subscribe({
      next: (res) => {
        this.collections.set(res.results);
        const contains = new Set<number>();
        res.results.forEach(c => {
          if (c.preview_prompts?.some((p: any) => p.id === this.prompt().id)) contains.add(c.id);
        });
        this.collectionContains.set(contains);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isPromptInCollection(id: number) { return this.collectionContains().has(id); }

  toggleCollection(c: Collection) {
    if (this.saving()) return;
    this.saving.set(true);
    if (this.isPromptInCollection(c.id)) {
      this.collectionService.removePrompt(c.id, this.prompt().id).subscribe({
        next: () => { this.collectionContains.update(s => { s.delete(c.id); return new Set(s); }); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    } else {
      this.collectionService.addPrompt(c.id, this.prompt().id).subscribe({
        next: () => {
          this.collectionContains.update(s => { s.add(c.id); return new Set(s); });
          this.saving.set(false);
          this.justSavedCollection.set(c.name);
          setTimeout(() => this.justSavedCollection.set(''), 2500);
        },
        error: () => this.saving.set(false),
      });
    }
  }

  createCollection() {
    const name = this.newCollectionName.trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    this.collectionService.createCollection({ name, icon: '📁' }).subscribe({
      next: (newCol) => {
        this.collections.update(list => [newCol, ...list]);
        this.newCollectionName = '';
        this.creatingNew.set(false);
        this.saving.set(false);
        this.toggleCollection(newCol);
      },
      error: () => this.saving.set(false),
    });
  }
}
