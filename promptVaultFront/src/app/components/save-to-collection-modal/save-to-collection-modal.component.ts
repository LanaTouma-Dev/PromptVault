import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Prompt } from '../../models/prompt.model';
import { CollectionService } from '../../core/services/collection.service';
import { Collection } from '../../models/prompt.model';

@Component({
  selector: 'app-save-to-collection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" (click)="close.emit()">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" (click)="$event.stopPropagation()">
        
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 class="font-display font-bold text-slate-900">Save to Collection</h3>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 transition">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        @if (justSavedCollection() !== '') {
          <div class="bg-green-50 border border-green-200 text-green-700 text-[13px] font-semibold px-3 py-2.5 rounded-lg mx-5 mt-4 mb-0 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">check_circle</span>
            Saved to {{ justSavedCollection() }}
          </div>
        }

        <div class="p-5">
          <div class="bg-slate-50 p-3 rounded-lg flex gap-3 items-start mb-5 border border-slate-100">
            <span class="material-symbols-outlined text-brand mt-0.5">description</span>
            <div>
              <p class="text-sm font-semibold text-slate-900 line-clamp-1">{{ prompt().title }}</p>
              <p class="text-xs text-slate-500 line-clamp-1 mt-0.5">{{ prompt().description }}</p>
            </div>
          </div>

          @if (loading()) {
            <div class="flex justify-center py-4">
               <span class="material-symbols-outlined animate-spin text-slate-300">progress_activity</span>
            </div>
          } @else {
            <div class="space-y-2 mb-5 max-h-48 overflow-y-auto pr-1">
              @for (c of collections(); track c.id) {
                <button
                  class="w-full flex items-center justify-between p-3 rounded-lg border text-left transition"
                  [class]="isPromptInCollection(c.id) ? 'border-brand bg-red-50' : 'border-slate-200 hover:border-slate-300'"
                  (click)="toggleCollection(c)"
                  [disabled]="saving()"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-xl">{{ c.icon }}</span>
                    <div>
                      <p class="text-sm font-semibold text-slate-900">{{ c.name }}</p>
                      <p class="text-[11px] text-slate-500">{{ c.prompt_count }} prompts</p>
                    </div>
                  </div>
                  @if (isPromptInCollection(c.id)) {
                    <span class="material-symbols-outlined text-brand text-[20px]">check_circle</span>
                  }
                </button>
              }
              
              @if (collections().length === 0) {
                <p class="text-sm text-slate-500 text-center py-3">No collections yet.</p>
              }
            </div>
          }
          
          <div class="border-t border-slate-100 pt-4 mt-2">
            @if (creatingNew()) {
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="newCollectionName"
                  placeholder="Collection name..."
                  class="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand"
                  (keyup.enter)="createCollection()"
                  autoFocus
                />
                <button
                  (click)="createCollection()"
                  [disabled]="!newCollectionName.trim() || saving()"
                  class="bg-brand text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >Save</button>
                <button
                  (click)="creatingNew.set(false)"
                  class="px-3 py-2 text-slate-500 bg-slate-100 rounded-lg text-[20px] hover:bg-slate-200"
                >
                  <span class="material-symbols-outlined text-[16px] mt-0.5">close</span>
                </button>
              </div>
            } @else {
              <button
                (click)="creatingNew.set(true)"
                class="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
              >
                <span class="material-symbols-outlined text-[18px]">add</span>
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
  
  // Track which collections currently have this prompt (by ID)
  collectionContains = signal<Set<number>>(new Set());

  ngOnInit() {
    this.loadCollections();
  }

  loadCollections() {
    this.loading.set(true);
    this.collectionService.getMyCollections().subscribe({
      next: (res) => {
        this.collections.set(res.results);
        
        // Figure out which collections already have this prompt
        const contains = new Set<number>();
        res.results.forEach(c => {
          if (c.preview_prompts.some(p => p.id === this.prompt().id)) {
            contains.add(c.id);
          }
        });
        this.collectionContains.set(contains);
        
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
  
  isPromptInCollection(collectionId: number) {
    return this.collectionContains().has(collectionId);
  }

  toggleCollection(c: Collection) {
    if (this.saving()) return;
    this.saving.set(true);
    
    if (this.isPromptInCollection(c.id)) {
      // Remove
      this.collectionService.removePrompt(c.id, this.prompt().id).subscribe({
        next: () => {
          this.collectionContains.update(s => { s.delete(c.id); return new Set(s); });
          this.saving.set(false);
        },
        error: (err) => {
          console.error("Remove prompt error", err);
          this.saving.set(false);
        }
      });
    } else {
      // Add
      this.collectionService.addPrompt(c.id, this.prompt().id).subscribe({
        next: () => {
          this.collectionContains.update(s => { s.add(c.id); return new Set(s); });
          this.saving.set(false);
          this.justSavedCollection.set(c.name);
          setTimeout(() => this.justSavedCollection.set(''), 2500);
        },
        error: (err) => {
          console.error("Add prompt error", err);
          this.saving.set(false);
        }
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
        
        // Let toggleCollection run, so we unset saving first
        this.saving.set(false);
        
        // Auto-add the prompt
        this.toggleCollection(newCol);
      },
      error: (err) => {
        console.error("Create collection error", err);
        this.saving.set(false);
      }
    });
  }
}
