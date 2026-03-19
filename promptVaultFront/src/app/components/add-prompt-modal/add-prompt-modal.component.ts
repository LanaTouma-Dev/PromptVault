import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromptService } from '../../core/services/prompt.service';
import { CategoryService } from '../../core/services/category.service';
import { AIToolService } from '../../core/services/ai-tool.service';
import { AITool, Category } from '../../models/prompt.model';

const VAR_REGEX = /\{\{(\w+)\}\}/g;

@Component({
  selector: 'app-add-prompt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" (click)="close.emit()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 class="font-display font-bold text-lg text-slate-900">New Prompt</h2>
            <p class="text-xs text-slate-400">PromptVault / Engineering</p>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="close.emit()" class="text-sm text-slate-500 hover:text-slate-800">Discard</button>
            <button (click)="submit()" [disabled]="saving"
              class="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition disabled:opacity-50">
              {{ saving ? 'Publishing...' : 'Publish Prompt' }}
            </button>
          </div>
        </div>

        <!-- Body (scrollable) -->
        <div class="p-6 space-y-4 overflow-y-auto">
          @if (error) {
            <div class="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{{ error }}</div>
          }

          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input [(ngModel)]="form.title" type="text" placeholder="e.g. React Component Generator"
              class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Short description</label>
            <input [(ngModel)]="form.description" type="text" placeholder="What does this prompt do?"
              class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
          </div>

          <!-- Category + Visibility -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select [(ngModel)]="form.category_id"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— None —</option>
                @for (cat of categories; track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <select [(ngModel)]="form.visibility"
                class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="shared">Shared (team)</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <!-- Compatible AI Tools -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Works With
              <span class="text-slate-400 font-normal ml-1">(select all that apply)</span>
            </label>
            <div class="flex flex-wrap gap-2">
              @for (tool of aiTools; track tool.id) {
                <button
                  type="button"
                  (click)="toggleTool(tool.id)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition"
                  [ngClass]="isSelected(tool.id)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'"
                >
                  <span class="material-symbols-outlined" style="font-size:13px;">smart_toy</span>
                  {{ tool.name }}
                  <span class="opacity-70 text-[10px]">· {{ pricingLabel(tool.pricing) }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Prompt content -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-medium text-slate-700">Prompt Content</label>
              <span class="text-xs text-slate-400">Use {{ '{{variable}}' }} for dynamic values</span>
            </div>
            <textarea
              [(ngModel)]="form.content"
              (ngModelChange)="detectVars()"
              rows="8"
              [placeholder]="contentPlaceholder"
              class="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            ></textarea>
          </div>

          <!-- Detected variables -->
          @if (detectedVars.length) {
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-slate-500 font-medium">Detected variables:</span>
              @for (v of detectedVars; track v) {
                <span class="px-2 py-0.5 text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  {{ '{{' + v + '}}' }}
                </span>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AddPromptModalComponent {
  close = output<void>();
  saved = output<void>();

  readonly contentPlaceholder = 'You are an expert {{role}}. Your task is to...';

  private promptService = inject(PromptService);
  private categoryService = inject(CategoryService);
  private aiToolService = inject(AIToolService);

  categories: Category[] = [];
  aiTools: AITool[] = [];
  selectedToolIds: number[] = [];
  saving = false;
  error = '';
  detectedVars: string[] = [];

  form = {
    title: '',
    description: '',
    content: '',
    category_id: '',
    visibility: 'shared' as 'shared' | 'private',
  };

  constructor() {
    this.categoryService.getCategories().subscribe(res => this.categories = res.results);
    this.aiToolService.getTools().subscribe(res => this.aiTools = res.results);
  }

  toggleTool(id: number) {
    if (this.selectedToolIds.includes(id)) {
      this.selectedToolIds = this.selectedToolIds.filter(t => t !== id);
    } else {
      this.selectedToolIds = [...this.selectedToolIds, id];
    }
  }

  isSelected(id: number): boolean {
    return this.selectedToolIds.includes(id);
  }

  pricingLabel(pricing: AITool['pricing']): string {
    switch (pricing) {
      case 'free':     return 'Free';
      case 'freemium': return 'Free tier';
      case 'paid':     return 'Paid';
    }
  }

  detectVars() {
    const matches = [...this.form.content.matchAll(VAR_REGEX)];
    this.detectedVars = [...new Set(matches.map(m => m[1]))];
  }

  submit() {
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.error = 'Title and content are required.';
      return;
    }
    this.saving = true; this.error = '';
    const payload: any = {
      title: this.form.title,
      description: this.form.description,
      content: this.form.content,
      visibility: this.form.visibility,
    };
    if (this.form.category_id) payload['category_id'] = +this.form.category_id;
    if (this.selectedToolIds.length) payload['tool_ids'] = this.selectedToolIds;

    this.promptService.createPrompt(payload).subscribe({
      next: () => { this.saving = false; this.saved.emit(); this.close.emit(); },
      error: (err) => { this.saving = false; this.error = JSON.stringify(err.error); },
    });
  }
}
