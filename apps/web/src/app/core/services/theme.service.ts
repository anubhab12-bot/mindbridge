import { Injectable, computed, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly STORAGE_KEY = 'mb_theme';

  readonly theme = signal<AppTheme>('light');
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    let initialTheme: AppTheme = 'light';
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as AppTheme | null;
      if (saved === 'dark' || saved === 'light') {
        initialTheme = saved;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialTheme = 'dark';
      }
    } catch {
      // localStorage may be restricted in private browsing
    }

    this.applyTheme(initialTheme);

    // Listen to system changes if user hasn't chosen manually
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        try {
          if (!localStorage.getItem(this.STORAGE_KEY)) {
            this.applyTheme(e.matches ? 'dark' : 'light');
          }
        } catch {}
      });
    }
  }

  toggleTheme(): void {
    const next: AppTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: AppTheme): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
      // Mirror to admin portal theme key so preferences stay harmonized
      localStorage.setItem('mb_admin_theme', theme);
    } catch {}
    this.applyTheme(theme);
  }

  private applyTheme(theme: AppTheme): void {
    this.theme.set(theme);
    const root = this.document.documentElement;
    root.setAttribute('data-theme', theme);
  }
}
