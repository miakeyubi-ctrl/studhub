import { Injectable } from '@angular/core';

export type AppActiveRole = 'student' | 'agent' | 'partner';

const STORAGE_KEY = 'studhub-active-role';

/**
 * Rôle UI actif (étudiant / agent / partenaire).
 * Sert à choisir le bon JWT quand plusieurs sessions coexistent.
 */
@Injectable({ providedIn: 'root' })
export class ActiveRoleService {
  private role: AppActiveRole | null = null;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'student' || saved === 'agent' || saved === 'partner') {
      this.role = saved;
    }
  }

  set(role: AppActiveRole): void {
    this.role = role;
    try { localStorage.setItem(STORAGE_KEY, role); } catch {}
  }

  get(): AppActiveRole | null {
    return this.role;
  }

  preferAgent(): boolean {
    return this.role === 'agent';
  }

  preferPartner(): boolean {
    return this.role === 'partner';
  }
}
