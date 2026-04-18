import {
  Component, output, input, inject, signal, computed, HostListener, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromptService } from '../../core/services/prompt.service';
import { CategoryService } from '../../core/services/category.service';
import { AIToolService } from '../../core/services/ai-tool.service';
import { AITool, Category, Prompt } from '../../models/prompt.model';

const VAR_REGEX = /\{\{(\w+)\}\}/g;

const BUILTIN_MODELS: Array<Pick<AITool, 'name' | 'pricing' | 'color'>> = [
  { name: 'ChatGPT',       pricing: 'freemium', color: '#10a37f' },
  { name: 'Claude',        pricing: 'freemium', color: '#cc785c' },
  { name: 'GPT-4o',        pricing: 'paid',     color: '#10a37f' },
  { name: 'Gemini',        pricing: 'freemium', color: '#4285F4' },
  { name: 'GitHub Copilot',pricing: 'paid',     color: '#1F2328' },
  { name: 'Llama 3',       pricing: 'free',     color: '#0467DF' },
  { name: 'Mistral',       pricing: 'freemium', color: '#FF7000' },
  { name: 'Grok',          pricing: 'freemium', color: '#1DA1F2' },
  { name: 'Perplexity',    pricing: 'freemium', color: '#20808D' },
  { name: 'DeepSeek',      pricing: 'free',     color: '#4D6BFE' },
  { name: 'Command R+',    pricing: 'paid',     color: '#39594D' },
  { name: 'Phi-3',         pricing: 'free',     color: '#00A8E0' },
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
      display: flex; align-items: center; justify-content: center; padding: 1rem;
      background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
      animation: fadeIn 180ms ease both;
    }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
    .sheet {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; box-shadow: 0 32px 80px rgba(0,0,0,.22);
      width: 100%; max-width: 640px; max-height: 90vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: sheetIn 260ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes sheetIn {
      from { opacity:0; transform:translateY(28px) scale(.97) }
      to   { opacity:1; transform:translateY(0) scale(1) }
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .modal-title { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -.3px; }
    .modal-sub   { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
    .btn-discard {
      background: none; border: none; cursor: pointer;
      font-size: 13px; color: var(--text-muted); padding: 6px 10px; border-radius: 8px;
      transition: background 150ms, color 150ms;
    }
    .btn-discard:hover { background: var(--surface2); color: var(--text); }
    .btn-publish {
      height: 36px; padding: 0 18px; background: var(--accent); color: #fff;
      border: none; border-radius: 10px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 150ms, transform 100ms;
    }
    .btn-publish:hover  { opacity: 0.88; }
    .btn-publish:active { transform: scale(.97); }
    .btn-publish:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    .steps {
      display: flex; padding: 0 24px;
      border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .step-btn {
      background: none; border: none; cursor: pointer;
      font-size: 12px; font-weight: 500; color: var(--text-muted);
      padding: 10px 14px; position: relative; transition: color 180ms; white-space: nowrap;
    }
    .step-btn.active { color: var(--accent-txt); }
    .step-btn.active::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px;
      background: var(--accent); border-radius: 2px 2px 0 0;
    }
    .step-btn.done { color: #22c55e; }
    .step-dot {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; border-radius: 50%;
      font-size: 10px; font-weight: 700; margin-right: 5px;
    }
    .step-btn .step-dot { background: var(--surface2); color: var(--text-muted); }
    .step-btn.active .step-dot { background: var(--accent); color: #fff; }
    .step-btn.done  .step-dot { background: #22c55e; color: #fff; }
    .modal-body { flex: 1; overflow-y: auto; padding: 22px 24px; }
    .modal-body::-webkit-scrollbar { width: 4px; }
    .modal-body::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 4px; }
    .panel { display: none; animation: panelIn 220ms cubic-bezier(.22,1,.36,1) both; }
    .panel.active { display: block; }
    @keyframes panelIn {
      from { opacity:0; transform:translateX(18px) }
      to   { opacity:1; transform:translateX(0) }
    }
    .field + .field { margin-top: 16px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    label {
      display: block; font-size: 12px; font-weight: 600; color: var(--text-muted);
      margin-bottom: 6px; letter-spacing: .2px; text-transform: uppercase;
    }
    .field-hint { font-size: 11px; color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; margin-left: 6px; }
    input[type="text"], select, textarea {
      width: 100%; background: var(--surface2); border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 13px; font-size: 14px; color: var(--text);
      outline: none; transition: border-color 160ms, box-shadow 160ms, background 160ms;
    }
    input[type="text"]:focus, select:focus, textarea:focus {
      border-color: var(--accent); background: var(--surface);
      box-shadow: 0 0 0 3px var(--accent-bg);
    }
    input[type="text"]::placeholder, textarea::placeholder { color: var(--text-muted); opacity: 0.5; }
    textarea { resize: none; font-family: 'Menlo','Fira Code',monospace; font-size: 13px; line-height: 1.6; }
    select { cursor: pointer; }
    .error-banner {
      background: var(--hot-bg); border: 1px solid var(--hot); color: var(--hot);
      border-radius: 8px; padding: 10px 13px; font-size: 13px; margin-bottom: 14px;
      animation: shake .3s ease;
    }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
    .model-search-wrap { position: relative; margin-bottom: 12px; }
    .model-search-wrap svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
    .model-search-input { padding-left: 34px !important; }
    .model-dropdown {
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,.15); max-height: 220px; overflow-y: auto; margin-top: 4px;
      animation: dropIn 160ms cubic-bezier(.22,1,.36,1);
    }
    @keyframes dropIn { from{opacity:0;transform:translateY(-8px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
    .model-dropdown::-webkit-scrollbar { width: 4px; }
    .model-dropdown::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 4px; }
    .model-option {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 13px; cursor: pointer; transition: background 120ms;
    }
    .model-option:hover { background: var(--surface2); }
    .model-option:first-child { border-radius: 10px 10px 0 0; }
    .model-option:last-child  { border-radius: 0 0 10px 10px; }
    .model-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .model-option-name { font-size: 13px; font-weight: 500; color: var(--text); flex: 1; }
    .model-option-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; text-transform: uppercase; letter-spacing: .4px; }
    .badge-free     { background: #e6f7ee; color: #1a7a45; }
    .badge-freemium { background: rgba(96,84,232,0.08); color: var(--accent-txt); }
    .badge-paid     { background: var(--hot-bg); color: var(--hot); }
    .model-empty { padding: 14px 13px; font-size: 13px; color: var(--text-muted); text-align: center; }
    .add-custom-row { display: flex; gap: 8px; margin-top: 6px; }
    .add-custom-row input { flex: 1; }
    .pricing-toggle { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .pricing-opt { background: none; border: none; cursor: pointer; padding: 9px 11px; font-size: 11px; font-weight: 600; letter-spacing: .3px; transition: background 140ms, color 140ms; color: var(--text-muted); }
    .pricing-opt.sel-free     { background: #e6f7ee; color: #1a7a45; }
    .pricing-opt.sel-freemium { background: var(--accent-bg); color: var(--accent-txt); }
    .pricing-opt.sel-paid     { background: var(--hot-bg); color: var(--hot); }
    .btn-add-model {
      background: var(--accent); color: #fff; border: none; border-radius: 10px;
      padding: 0 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      transition: opacity 140ms; white-space: nowrap;
    }
    .btn-add-model:hover { opacity: 0.88; }
    .btn-add-model:disabled { opacity: .4; cursor: not-allowed; }
    .chips-area { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 20px; border: 1.5px solid;
      font-size: 12px; font-weight: 500; cursor: default;
      animation: chipIn 200ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes chipIn { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:scale(1)} }
    .chip-remove { background: none; border: none; cursor: pointer; font-size: 14px; line-height: 1; padding: 0; margin-left: 2px; opacity: .5; transition: opacity 120ms; }
    .chip-remove:hover { opacity: 1; }
    .vars-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .var-pill {
      padding: 3px 9px; background: var(--accent-bg); color: var(--accent-txt);
      border: 1px solid var(--border-mid); border-radius: 6px;
      font-size: 11px; font-family: monospace; font-weight: 600;
      animation: chipIn 180ms cubic-bezier(.22,1,.36,1) both;
    }
    .modal-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px; border-top: 1px solid var(--border); flex-shrink: 0;
      background: var(--surface2);
    }
    .btn-nav { height: 36px; padding: 0 16px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 140ms, transform 100ms; }
    .btn-nav:active { transform: scale(.97); }
    .btn-prev { background: var(--surface); border: 1px solid var(--border); color: var(--text-muted); }
    .btn-prev:hover { background: var(--surface2); }
    .btn-next { background: var(--accent); border: none; color: #fff; }
    .btn-next:hover { opacity: 0.88; }
    .step-indicator { display: flex; gap: 6px; align-items: center; }
    .step-pip { width: 6px; height: 6px; border-radius: 50%; background: var(--border-mid); transition: background 250ms, width 250ms; }
    .step-pip.active { background: var(--accent); width: 18px; border-radius: 3px; }
    .step-pip.done   { background: #22c55e; }
  `],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <div>
            <p class="modal-title">{{ isEditMode ? 'Edit Prompt' : 'New Prompt' }}</p>
            <p class="modal-sub">PromptOverflow</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn-discard" (click)="close.emit()">Discard</button>
            <button class="btn-publish" (click)="submit()" [disabled]="saving">
              {{ saving ? (isEditMode ? 'Saving…' : 'Publishing…') : (isEditMode ? 'Save Changes' : 'Publish Prompt') }}
            </button>
          </div>
        </div>

        <div class="steps">
          @for (s of stepLabels; track $index; let i = $index) {
            <button class="step-btn" [class.active]="step() === i" [class.done]="step() > i" (click)="goStep(i)">
              <span class="step-dot">{{ step() > i ? '✓' : (i + 1) }}</span>{{ s }}
            </button>
          }
        </div>

        <div class="modal-body">
          @if (error()) { <div class="error-banner">{{ error() }}</div> }

          <!-- Step 0: Basics -->
          <div class="panel" [class.active]="step() === 0">
            <div class="field">
              <label>Title</label>
              <input type="text" [(ngModel)]="form.title" placeholder="e.g. Angular Service Generator" />
            </div>
            <div class="field">
              <label>Short description</label>
              <input type="text" [(ngModel)]="form.description" placeholder="What does this prompt do?" />
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
                  <option value="shared">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Step 1: Models -->
          <div class="panel" [class.active]="step() === 1">
            <label>Search &amp; select models <span class="field-hint">pick as many as apply</span></label>
            <div class="model-search-wrap">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="var(--text-muted)" stroke-width="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <input type="text" class="model-search-input" [(ngModel)]="modelQuery"
                (ngModelChange)="onModelSearch()" (focus)="dropdownOpen = true"
                placeholder="Search ChatGPT, Claude, Gemini…" />
            </div>
            @if (dropdownOpen && filteredModels().length > 0) {
              <div class="model-dropdown">
                @for (m of filteredModels(); track m.name) {
                  <div class="model-option" (mousedown)="addModelFromDropdown(m)">
                    <span class="model-dot" [style.background]="m.color"></span>
                    <span class="model-option-name">{{ m.name }}</span>
                    <span class="model-option-badge" [ngClass]="badgeClass(m.pricing)">{{ pricingLabel(m.pricing) }}</span>
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
                  <span class="chip" [style.border-color]="m.color+'55'" [style.background]="m.color+'12'" [style.color]="m.color">
                    <span class="model-dot" [style.background]="m.color"></span>
                    {{ m.name }}
                    <span class="model-option-badge" [ngClass]="badgeClass(m.pricing)" style="margin-left:2px">{{ pricingLabel(m.pricing) }}</span>
                    <button class="chip-remove" (click)="removeModel(m.name)">&times;</button>
                  </span>
                }
              </div>
            } @else {
              <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">No models selected yet.</p>
            }
            <div style="margin-top:18px">
              <label>Add custom model <span class="field-hint">not in the list above?</span></label>
              <div class="add-custom-row">
                <input type="text" [(ngModel)]="customModelName" placeholder="e.g. Qwen 2.5…" />
                <div class="pricing-toggle">
                  @for (p of pricingOpts; track p.value) {
                    <button class="pricing-opt" [class]="customPricing===p.value?('pricing-opt sel-'+p.value):'pricing-opt'"
                      (click)="customPricing=p.value">{{ p.label }}</button>
                  }
                </div>
                <button class="btn-add-model" [disabled]="!customModelName.trim()" (click)="addCustomModel()">+ Add</button>
              </div>
            </div>
          </div>

          <!-- Step 2: Content -->
          <div class="panel" [class.active]="step() === 2">
            <div class="field">
              <label>Prompt content <span class="field-hint">use {{ varHint }} for dynamic values</span></label>
              <textarea rows="11" [(ngModel)]="form.content" (ngModelChange)="detectVars()" [placeholder]="contentPlaceholder"></textarea>
            </div>
            @if (detectedVars().length) {
              <div style="margin-top:10px">
                <p style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.3px; margin-bottom:6px;">Detected variables</p>
                <div class="vars-row">
                  @for (v of detectedVars(); track v) { <span class="var-pill">{{ wrapVar(v) }}</span> }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-nav btn-prev" [style.visibility]="step()>0?'visible':'hidden'" (click)="prevStep()">← Back</button>
          <div class="step-indicator">
            @for (s of stepLabels; track $index; let i = $index) {
              <div class="step-pip" [class.active]="step()===i" [class.done]="step()>i"></div>
            }
          </div>
          @if (step() < 2) {
            <button class="btn-nav btn-next" (click)="nextStep()">Continue →</button>
          } @else {
            <button class="btn-nav btn-next" (click)="submit()" [disabled]="saving">
              {{ saving ? '…' : (isEditMode ? 'Save →' : 'Publish →') }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class AddPromptModalComponent implements OnInit {
  close         = output<void>();
  saved         = output<void>();
  /** Pass a prompt to open the modal in edit mode */
  promptToEdit  = input<Prompt | null>(null);

  private promptService   = inject(PromptService);
  private categoryService = inject(CategoryService);
  private aiToolService   = inject(AIToolService);

  get isEditMode() { return !!this.promptToEdit(); }

  categories: Category[] = [];
  apiTools:   AITool[]   = [];

  step       = signal(0);
  stepLabels = ['Basics', 'Models', 'Content'];
  saving     = false;
  error      = signal('');

  readonly varHint           = '{{variable}}';
  readonly contentPlaceholder = 'You are an expert {{role}}. Your task is to…';

  modelQuery       = '';
  dropdownOpen     = false;
  customModelName  = '';
  customPricing: 'free' | 'freemium' | 'paid' = 'freemium';
  pricingOpts = [
    { label: 'Free',     value: 'free'     as const },
    { label: 'Freemium', value: 'freemium' as const },
    { label: 'Paid',     value: 'paid'     as const },
  ];

  private allModels  = signal<ModelEntry[]>([]);
  selectedModels     = signal<ModelEntry[]>([]);
  filteredModels     = computed(() => {
    const q   = this.modelQuery.toLowerCase().trim();
    const sel = new Set(this.selectedModels().map(m => m.name));
    return this.allModels().filter(m => !sel.has(m.name)).filter(m => !q || m.name.toLowerCase().includes(q));
  });
  detectedVars = signal<string[]>([]);

  form = {
    title: '', description: '', content: '',
    category_id: '', visibility: 'shared' as 'shared' | 'private',
  };

  constructor() {
    this.allModels.set(BUILTIN_MODELS.map(m => ({ ...m })));
    this.categoryService.getCategories().subscribe(res => {
      this.categories = res.results;
      this.prefillIfEdit(); // re-prefill once categories are ready
    });
    this.aiToolService.getTools().subscribe(res => {
      this.apiTools = res.results;
      const apiNames = new Set(res.results.map(t => t.name));
      this.allModels.set([
        ...res.results.map(t => ({ id: t.id, name: t.name, pricing: t.pricing, color: t.color || '#888' })),
        ...BUILTIN_MODELS.filter(b => !apiNames.has(b.name)),
      ]);
      this.prefillIfEdit(); // re-prefill once tools are ready
    });
  }

  ngOnInit() {
    this.prefillIfEdit();
  }

  private prefillIfEdit() {
    const p = this.promptToEdit();
    if (!p) return;
    this.form.title       = p.title;
    this.form.description = p.description;
    this.form.content     = p.content;
    this.form.visibility  = p.visibility;
    this.form.category_id = p.category?.id?.toString() ?? '';
    this.detectVars();

    // Pre-select compatible tools
    if (p.compatible_tools?.length && this.allModels().length > 1) {
      const preselected = p.compatible_tools.map(t => ({
        id: t.id, name: t.name, pricing: t.pricing, color: t.color || '#888',
      }));
      this.selectedModels.set(preselected);
    }
  }

  goStep(i: number)  { this.step.set(i); }
  nextStep()         { if (this.step() < 2) this.step.update(s => s + 1); }
  prevStep()         { if (this.step() > 0) this.step.update(s => s - 1); }
  onModelSearch()    { this.dropdownOpen = true; }

  addModelFromDropdown(m: ModelEntry) {
    this.selectedModels.update(sel => [...sel, m]);
    this.modelQuery = ''; this.dropdownOpen = false;
  }
  removeModel(name: string) { this.selectedModels.update(sel => sel.filter(m => m.name !== name)); }
  addCustomModel() {
    const name = this.customModelName.trim();
    if (!name || this.selectedModels().some(m => m.name.toLowerCase() === name.toLowerCase())) return;
    this.selectedModels.update(sel => [...sel, { name, pricing: this.customPricing, color: '#888' }]);
    this.customModelName = ''; this.dropdownOpen = false;
  }

  wrapVar(v: string) { return '{{' + v + '}}'; }

  @HostListener('document:click')
  closeDropdown() { this.dropdownOpen = false; }

  detectVars() {
    const matches = [...this.form.content.matchAll(VAR_REGEX)];
    this.detectedVars.set([...new Set(matches.map(m => m[1]))]);
  }

  pricingLabel(p: AITool['pricing']) { return p === 'free' ? 'Free' : p === 'freemium' ? 'Free tier' : 'Paid'; }
  badgeClass(p: AITool['pricing'])   { return 'model-option-badge badge-' + p; }

  submit() {
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.error.set('Title and prompt content are required.');
      this.step.set(this.form.title.trim() ? 2 : 0);
      return;
    }
    this.saving = true; this.error.set('');

    const apiNameMap = new Map(this.apiTools.map(t => [t.name.toLowerCase(), t.id]));
    const tool_ids = this.selectedModels()
      .map(m => apiNameMap.get(m.name.toLowerCase()))
      .filter((id): id is number => id !== undefined);

    const payload: Record<string, unknown> = {
      title: this.form.title, description: this.form.description,
      content: this.form.content, visibility: this.form.visibility,
    };
    if (this.form.category_id) payload['category_id'] = +this.form.category_id;
    payload['tool_ids'] = tool_ids;

    const req$ = this.isEditMode
      ? this.promptService.updatePrompt(this.promptToEdit()!.id, payload)
      : this.promptService.createPrompt(payload);

    req$.subscribe({
      next: () => { this.saving = false; this.saved.emit(); this.close.emit(); },
      error: (err) => { this.saving = false; this.error.set(JSON.stringify(err.error)); },
    });
  }
}
