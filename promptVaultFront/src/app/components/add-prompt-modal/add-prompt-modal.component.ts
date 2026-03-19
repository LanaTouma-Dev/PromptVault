import {
  Component, output, inject, signal, computed, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromptService } from '../../core/services/prompt.service';
import { CategoryService } from '../../core/services/category.service';
import { AIToolService } from '../../core/services/ai-tool.service';
import { AITool, Category } from '../../models/prompt.model';

const VAR_REGEX = /\{\{(\w+)\}\}/g;

const BUILTIN_MODELS: Array<Pick<AITool, 'name' | 'pricing' | 'color'>> = [
  { name: 'ChatGPT',        pricing: 'freemium', color: '#10a37f' },
  { name: 'Claude',         pricing: 'freemium', color: '#cc785c' },
  { name: 'GPT-4o',         pricing: 'paid',     color: '#10a37f' },
  { name: 'Gemini',         pricing: 'freemium', color: '#4285F4' },
  { name: 'GitHub Copilot', pricing: 'paid',     color: '#1F2328' },
  { name: 'Llama 3',        pricing: 'free',     color: '#0467DF' },
  { name: 'Mistral',        pricing: 'freemium', color: '#FF7000' },
  { name: 'Grok',           pricing: 'freemium', color: '#1DA1F2' },
  { name: 'Perplexity',     pricing: 'freemium', color: '#20808D' },
  { name: 'DeepSeek',       pricing: 'free',     color: '#4D6BFE' },
  { name: 'Command R+',     pricing: 'paid',     color: '#39594D' },
  { name: 'Phi-3',          pricing: 'free',     color: '#00A8E0' },
];

type ModelEntry = Pick<AITool, 'name' | 'pricing' | 'color'> & { id?: number };

@Component({
  selector: 'app-add-prompt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; }

    .overlay {
      position: fixed; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(4px);
      animation: fadeIn 180ms ease both;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .sheet {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 32px 80px rgba(0,0,0,.22);
      width: 100%; max-width: 640px;
      max-height: 90vh;
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: sheetIn 260ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes sheetIn {
      from { opacity: 0; transform: translateY(28px) scale(.97) }
      to   { opacity: 1; transform: translateY(0) scale(1) }
    }

    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px 16px;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .modal-title { font-size: 16px; font-weight: 700; color: #111; letter-spacing: -.3px; }
    .modal-sub   { font-size: 12px; color: #a0a0a0; margin-top: 1px; }

    .btn-discard {
      background: none; border: none; cursor: pointer;
      font-size: 13px; color: #888; padding: 6px 10px; border-radius: 8px;
      transition: background 150ms, color 150ms;
    }
    .btn-discard:hover { background: #f5f5f5; color: #333; }

    .btn-publish {
      height: 36px; padding: 0 18px;
      background: #D85A30; color: #fff;
      border: none; border-radius: 10px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; letter-spacing: .1px;
      transition: background 150ms, transform 100ms, box-shadow 150ms;
      box-shadow: 0 2px 8px rgba(216,90,48,.3);
    }
    .btn-publish:hover  { background: #c44f27; box-shadow: 0 4px 14px rgba(216,90,48,.38); }
    .btn-publish:active { transform: scale(.97); }
    .btn-publish:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    .steps {
      display: flex;
      padding: 0 24px;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .step-btn {
      background: none; border: none; cursor: pointer;
      font-size: 12px; font-weight: 500; color: #aaa;
      padding: 10px 14px; position: relative;
      transition: color 180ms;
      white-space: nowrap;
    }
    .step-btn.active { color: #D85A30; }
    .step-btn.active::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px;
      background: #D85A30; border-radius: 2px 2px 0 0;
    }
    .step-btn.done { color: #22c55e; }
    .step-dot {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; border-radius: 50%;
      font-size: 10px; font-weight: 700; margin-right: 5px;
    }
    .step-btn .step-dot { background: #e8e8e8; color: #aaa; }
    .step-btn.active .step-dot { background: #D85A30; color: #fff; }
    .step-btn.done  .step-dot { background: #22c55e; color: #fff; }

    .modal-body {
      flex: 1; overflow-y: auto; padding: 22px 24px;
    }
    .modal-body::-webkit-scrollbar { width: 4px; }
    .modal-body::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }

    .panel { display: none; animation: panelIn 220ms cubic-bezier(.22,1,.36,1) both; }
    .panel.active { display: block; }
    @keyframes panelIn {
      from { opacity: 0; transform: translateX(18px) }
      to   { opacity: 1; transform: translateX(0) }
    }

    .field + .field { margin-top: 16px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    label { display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; letter-spacing: .2px; text-transform: uppercase; }
    .field-hint { font-size: 11px; color: #aaa; font-weight: 400; text-transform: none; letter-spacing: 0; margin-left: 6px; }

    input[type="text"], select, textarea {
      width: 100%; background: #fafafa;
      border: 1.5px solid #ebebeb; border-radius: 10px;
      padding: 10px 13px; font-size: 14px; color: #111;
      outline: none; transition: border-color 160ms, box-shadow 160ms, background 160ms;
    }
    input[type="text"]:focus, select:focus, textarea:focus {
      border-color: #D85A30; background: #fff;
      box-shadow: 0 0 0 3px rgba(216,90,48,.12);
    }
    input[type="text"]::placeholder, textarea::placeholder { color: #c0c0c0; }
    textarea { resize: none; font-family: 'Menlo', 'Fira Code', monospace; font-size: 13px; line-height: 1.6; }
    select { cursor: pointer; }

    .error-banner {
      background: #fff1f0; border: 1px solid #ffa39e; color: #cf1322;
      border-radius: 8px; padding: 10px 13px; font-size: 13px; margin-bottom: 14px;
      animation: shake .3s ease;
    }
    @keyframes shake {
      0%,100% { transform: translateX(0) }
      20%,60% { transform: translateX(-5px) }
      40%,80% { transform: translateX(5px) }
    }

    .model-search-wrap { position: relative; margin-bottom: 12px; }
    .model-search-wrap svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
    .model-search-input { padding-left: 34px !important; }

    .model-dropdown {
      background: #fff; border: 1.5px solid #ebebeb; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,.12);
      max-height: 220px; overflow-y: auto;
      margin-top: 4px;
      animation: dropIn 160ms cubic-bezier(.22,1,.36,1);
    }
    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-8px) scale(.98) }
      to   { opacity: 1; transform: translateY(0) scale(1) }
    }
    .model-dropdown::-webkit-scrollbar { width: 4px; }
    .model-dropdown::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }

    .model-option {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 13px; cursor: pointer;
      transition: background 120ms;
    }
    .model-option:hover { background: #faf7f5; }
    .model-option:first-child { border-radius: 10px 10px 0 0; }
    .model-option:last-child  { border-radius: 0 0 10px 10px; }
    .model-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .model-option-name { font-size: 13px; font-weight: 500; color: #222; flex: 1; }
    .model-option-badge {
      font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: .4px;
    }
    .badge-free     { background: #e6f7ee; color: #1a7a45; }
    .badge-freemium { background: #fff7e6; color: #7a4f00; }
    .badge-paid     { background: #fff1f0; color: #cf1322; }
    .model-empty { padding: 14px 13px; font-size: 13px; color: #aaa; text-align: center; }

    .add-custom-row { display: flex; gap: 8px; margin-top: 6px; }
    .add-custom-row input { flex: 1; }
    .pricing-toggle { display: flex; border: 1.5px solid #ebebeb; border-radius: 10px; overflow: hidden; }
    .pricing-opt {
      background: none; border: none; cursor: pointer;
      padding: 9px 11px; font-size: 11px; font-weight: 600; letter-spacing: .3px;
      transition: background 140ms, color 140ms; color: #aaa;
    }
    .pricing-opt.sel-free     { background: #e6f7ee; color: #1a7a45; }
    .pricing-opt.sel-freemium { background: #fff7e6; color: #7a4f00; }
    .pricing-opt.sel-paid     { background: #fff1f0; color: #cf1322; }

    .btn-add-model {
      background: #D85A30; color: #fff; border: none; border-radius: 10px;
      padding: 0 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      transition: background 140ms; white-space: nowrap;
    }
    .btn-add-model:hover { background: #c44f27; }
    .btn-add-model:disabled { opacity: .4; cursor: not-allowed; }

    .chips-area { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 20px; border: 1.5px solid;
      font-size: 12px; font-weight: 500; cursor: default;
      animation: chipIn 200ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes chipIn {
      from { opacity: 0; transform: scale(.8) }
      to   { opacity: 1; transform: scale(1) }
    }
    .chip-remove {
      background: none; border: none; cursor: pointer;
      font-size: 14px; line-height: 1; padding: 0; margin-left: 2px;
      opacity: .5; transition: opacity 120ms;
    }
    .chip-remove:hover { opacity: 1; }

    .vars-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .var-pill {
      padding: 3px 9px; background: #fff8e6; color: #7a4f00;
      border: 1px solid #ffe0a0; border-radius: 6px;
      font-size: 11px; font-family: monospace; font-weight: 600;
      animation: chipIn 180ms cubic-bezier(.22,1,.36,1) both;
    }

    .modal-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px; border-top: 1px solid #f0f0f0; flex-shrink: 0;
      background: #fafafa;
    }
    .btn-nav {
      height: 36px; padding: 0 16px; border-radius: 9px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: background 140ms, transform 100ms;
    }
    .btn-nav:active { transform: scale(.97); }
    .btn-prev { background: #f0f0f0; border: none; color: #555; }
    .btn-prev:hover { background: #e8e8e8; }
    .btn-next { background: #D85A30; border: none; color: #fff; box-shadow: 0 2px 8px rgba(216,90,48,.25); }
    .btn-next:hover { background: #c44f27; }

    .step-indicator { display: flex; gap: 6px; align-items: center; }
    .step-pip {
      width: 6px; height: 6px; border-radius: 50%;
      background: #e0e0e0; transition: background 250ms, width 250ms;
    }
    .step-pip.active { background: #D85A30; width: 18px; border-radius: 3px; }
    .step-pip.done   { background: #22c55e; }
  `],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="modal-header">
          <div>
            <p class="modal-title">New Prompt</p>
            <p class="modal-sub">PromptVault / Engineering</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn-discard" (click)="close.emit()">Discard</button>
            <button class="btn-publish" (click)="submit()" [disabled]="saving">
              {{ saving ? 'Publishing\u2026' : 'Publish Prompt' }}
            </button>
          </div>
        </div>

        <!-- Step tabs -->
        <div class="steps">
          @for (s of stepLabels; track $index; let i = $index) {
            <button class="step-btn"
              [class.active]="step() === i"
              [class.done]="step() > i"
              (click)="goStep(i)">
              <span class="step-dot">{{ step() > i ? '\u2713' : (i + 1) }}</span>
              {{ s }}
            </button>
          }
        </div>

        <!-- Body -->
        <div class="modal-body">
          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          <!-- Step 0: Basics -->
          <div class="panel" [class.active]="step() === 0">
            <div class="field">
              <label>Title</label>
              <input type="text" [(ngModel)]="form.title"
                placeholder="e.g. Angular Service Generator" />
            </div>
            <div class="field">
              <label>Short description</label>
              <input type="text" [(ngModel)]="form.description"
                placeholder="What does this prompt do?" />
            </div>
            <div class="field field-row">
              <div>
                <label>Category</label>
                <select [(ngModel)]="form.category_id">
                  <option value="">— None —</option>
                  @for (cat of categories; track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label>Visibility</label>
                <select [(ngModel)]="form.visibility">
                  <option value="shared">Shared (team)</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Step 1: Models -->
          <div class="panel" [class.active]="step() === 1">
            <label>Search &amp; select models
              <span class="field-hint">pick as many as apply</span>
            </label>

            <div class="model-search-wrap">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="#aaa" stroke-width="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="#aaa" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <input type="text" class="model-search-input"
                [(ngModel)]="modelQuery"
                (ngModelChange)="onModelSearch()"
                (focus)="dropdownOpen = true"
                placeholder="Search ChatGPT, Claude, Gemini\u2026" />
            </div>

            @if (dropdownOpen && filteredModels().length > 0) {
              <div class="model-dropdown">
                @for (m of filteredModels(); track m.name) {
                  <div class="model-option" (mousedown)="addModelFromDropdown(m)">
                    <span class="model-dot" [style.background]="m.color"></span>
                    <span class="model-option-name">{{ m.name }}</span>
                    <span class="model-option-badge" [ngClass]="badgeClass(m.pricing)">
                      {{ pricingLabel(m.pricing) }}
                    </span>
                  </div>
                }
              </div>
            }
            @if (dropdownOpen && filteredModels().length === 0 && modelQuery.trim()) {
              <div class="model-dropdown">
                <div class="model-empty">No match — add "{{ modelQuery.trim() }}" as custom below</div>
              </div>
            }

            @if (selectedModels().length > 0) {
              <div class="chips-area">
                @for (m of selectedModels(); track m.name) {
                  <span class="chip"
                    [style.border-color]="m.color + '55'"
                    [style.background]="m.color + '12'"
                    [style.color]="m.color">
                    <span class="model-dot" [style.background]="m.color"></span>
                    {{ m.name }}
                    <span class="model-option-badge" [ngClass]="badgeClass(m.pricing)" style="margin-left:2px">
                      {{ pricingLabel(m.pricing) }}
                    </span>
                    <button class="chip-remove" (click)="removeModel(m.name)">&times;</button>
                  </span>
                }
              </div>
            } @else {
              <p style="font-size:12px;color:#bbb;margin-top:8px">No models selected yet.</p>
            }

            <div style="margin-top:18px">
              <label>Add custom model
                <span class="field-hint">not in the list above?</span>
              </label>
              <div class="add-custom-row">
                <input type="text" [(ngModel)]="customModelName"
                  placeholder="e.g. Qwen 2.5, Yi-34B\u2026" />
                <div class="pricing-toggle">
                  @for (p of pricingOpts; track p.value) {
                    <button class="pricing-opt"
                      [class]="customPricing === p.value ? ('pricing-opt sel-' + p.value) : 'pricing-opt'"
                      (click)="customPricing = p.value">
                      {{ p.label }}
                    </button>
                  }
                </div>
                <button class="btn-add-model"
                  [disabled]="!customModelName.trim()"
                  (click)="addCustomModel()">+ Add</button>
              </div>
            </div>
          </div>

          <!-- Step 2: Content -->
          <div class="panel" [class.active]="step() === 2">
            <div class="field">
              <label>Prompt content
                <span class="field-hint">use {{ varHint }} for dynamic values</span>
              </label>
              <textarea rows="11"
                [(ngModel)]="form.content"
                (ngModelChange)="detectVars()"
                [placeholder]="contentPlaceholder"></textarea>
            </div>

            @if (detectedVars().length) {
              <div style="margin-top:10px">
                <p style="font-size:11px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">
                  Detected variables
                </p>
                <div class="vars-row">
                  @for (v of detectedVars(); track v) {
                    <span class="var-pill">{{ wrapVar(v) }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-nav btn-prev"
            [style.visibility]="step() > 0 ? 'visible' : 'hidden'"
            (click)="prevStep()">&larr; Back</button>

          <div class="step-indicator">
            @for (s of stepLabels; track $index; let i = $index) {
              <div class="step-pip"
                [class.active]="step() === i"
                [class.done]="step() > i"></div>
            }
          </div>

          @if (step() < 2) {
            <button class="btn-nav btn-next" (click)="nextStep()">Continue &rarr;</button>
          } @else {
            <button class="btn-nav btn-next" (click)="submit()" [disabled]="saving">
              {{ saving ? 'Publishing\u2026' : 'Publish \u2192' }}
            </button>
          }
        </div>

      </div>
    </div>
  `,
})
export class AddPromptModalComponent {
  close = output<void>();
  saved = output<void>();

  private promptService = inject(PromptService);
  private categoryService = inject(CategoryService);
  private aiToolService = inject(AIToolService);

  categories: Category[] = [];
  apiTools: AITool[] = [];

  step = signal(0);
  stepLabels = ['Basics', 'Models', 'Content'];

  saving = false;
  error = signal('');

  // These plain string properties are used in the template to avoid
  // Angular trying to parse {{ }} syntax inside attribute strings.
  readonly varHint = '{{variable}}';
  readonly contentPlaceholder = 'You are an expert {{role}}. Your task is to\u2026';

  modelQuery = '';
  dropdownOpen = false;
  customModelName = '';
  customPricing: 'free' | 'freemium' | 'paid' = 'freemium';
  pricingOpts = [
    { label: 'Free',     value: 'free'     as const },
    { label: 'Freemium', value: 'freemium' as const },
    { label: 'Paid',     value: 'paid'     as const },
  ];

  private allModels = signal<ModelEntry[]>([]);
  selectedModels = signal<ModelEntry[]>([]);

  filteredModels = computed(() => {
    const q = this.modelQuery.toLowerCase().trim();
    const sel = new Set(this.selectedModels().map(m => m.name));
    return this.allModels()
      .filter(m => !sel.has(m.name))
      .filter(m => !q || m.name.toLowerCase().includes(q));
  });

  detectedVars = signal<string[]>([]);

  form = {
    title: '',
    description: '',
    content: '',
    category_id: '',
    visibility: 'shared' as 'shared' | 'private',
  };

  constructor() {
    // Seed with builtins immediately so dropdown works before API responds
    this.allModels.set(BUILTIN_MODELS.map(m => ({ ...m })));

    this.categoryService.getCategories().subscribe(res => this.categories = res.results);
    this.aiToolService.getTools().subscribe(res => {
      this.apiTools = res.results;
      const apiNames = new Set(res.results.map(t => t.name));
      const merged: ModelEntry[] = [
        ...res.results.map(t => ({ id: t.id, name: t.name, pricing: t.pricing, color: t.color || '#888' })),
        ...BUILTIN_MODELS.filter(b => !apiNames.has(b.name)),
      ];
      this.allModels.set(merged);
    });
  }

  goStep(i: number) { this.step.set(i); }
  nextStep() { if (this.step() < 2) this.step.update(s => s + 1); }
  prevStep() { if (this.step() > 0) this.step.update(s => s - 1); }

  onModelSearch() { this.dropdownOpen = true; }

  addModelFromDropdown(m: ModelEntry) {
    this.selectedModels.update(sel => [...sel, m]);
    this.modelQuery = '';
    this.dropdownOpen = false;
  }

  removeModel(name: string) {
    this.selectedModels.update(sel => sel.filter(m => m.name !== name));
  }

  addCustomModel() {
    const name = this.customModelName.trim();
    if (!name) return;
    if (this.selectedModels().some(m => m.name.toLowerCase() === name.toLowerCase())) return;
    this.selectedModels.update(sel => [...sel, { name, pricing: this.customPricing, color: '#888' }]);
    this.customModelName = '';
    this.dropdownOpen = false;
  }

  /** Wraps a variable name in {{ }} — done in TS to avoid Angular template parser issues */
  wrapVar(v: string): string {
    return '{{' + v + '}}';
  }

  @HostListener('document:click')
  closeDropdown() { this.dropdownOpen = false; }

  detectVars() {
    const matches = [...this.form.content.matchAll(VAR_REGEX)];
    this.detectedVars.set([...new Set(matches.map(m => m[1]))]);
  }

  pricingLabel(p: AITool['pricing']): string {
    return p === 'free' ? 'Free' : p === 'freemium' ? 'Free tier' : 'Paid';
  }

  badgeClass(p: AITool['pricing']): string {
    return 'model-option-badge badge-' + p;
  }

  submit() {
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.error.set('Title and prompt content are required.');
      this.step.set(this.form.title.trim() ? 2 : 0);
      return;
    }
    this.saving = true;
    this.error.set('');

    const apiNameMap = new Map(this.apiTools.map(t => [t.name.toLowerCase(), t.id]));
    const tool_ids = this.selectedModels()
      .map(m => apiNameMap.get(m.name.toLowerCase()))
      .filter((id): id is number => id !== undefined);

    const payload: Record<string, unknown> = {
      title: this.form.title,
      description: this.form.description,
      content: this.form.content,
      visibility: this.form.visibility,
    };
    if (this.form.category_id) payload['category_id'] = +this.form.category_id;
    if (tool_ids.length) payload['tool_ids'] = tool_ids;

    this.promptService.createPrompt(payload).subscribe({
      next: () => { this.saving = false; this.saved.emit(); this.close.emit(); },
      error: (err) => { this.saving = false; this.error.set(JSON.stringify(err.error)); },
    });
  }
}
