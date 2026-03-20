import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2.5 flex-shrink-0">
      <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="var(--accent)"/>
        <!-- subtle duplicate bolt for depth -->
        <path d="M18.5 5L10 18H16L13.5 27L23 14H17L18.5 5Z" fill="white" opacity="0.2"/>
        <!-- main bold bolt -->
        <path d="M17.5 7L11 17.5H16L14 25L22 14.5H17L17.5 7Z" fill="white"/>
      </svg>

      @if (showText()) {
        <span class="font-display font-bold tracking-tight leading-none"
              [style.font-size]="fontSize()">
          <span style="color:var(--text);">Prompt</span><span style="color:var(--accent);">Overflow</span>
        </span>
      }
    </div>
  `,
})
export class LogoComponent {
  size     = input<number>(28);
  showText = input<boolean>(true);
  fontSize = input<string>('14px');
}
