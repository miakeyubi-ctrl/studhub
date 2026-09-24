import { Injectable } from '@angular/core';

const STORAGE_KEY = 'studhub-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  isDark = false;

  constructor() {
    this.isDark = this.resolveInitialTheme();
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem(STORAGE_KEY, this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private resolveInitialTheme(): boolean {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === 'dark') return true;
    if (saved === 'light') return false;

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(): void {
    document.documentElement.classList.toggle('dark', this.isDark);
  }
}
