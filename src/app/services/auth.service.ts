import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface StudUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  university?: string;
}

interface StoredUser extends StudUser {
  password: string;
}

interface ResetRequest {
  email: string;
  code: string;
  expires: number;
}

interface ActionResult {
  success: boolean;
  /** i18n translation key (e.g. 'AUTH.ERROR_INVALID_CREDENTIALS'), not display text. */
  message?: string;
}

interface SendCodeResult extends ActionResult {
  devCode?: string;
}

const USERS_KEY = 'studhub-users';
const SESSION_KEY = 'studhub-session';
const RESET_KEY = 'studhub-reset-request';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private userSubject = new BehaviorSubject<StudUser | null>(this.loadSession());
  user$ = this.userSubject.asObservable();

  get currentUser(): StudUser | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  register(fullName: string, email: string, password: string, phone?: string, university?: string): ActionResult {
    const users = this.loadUsers();

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'AUTH.ERROR_EMAIL_TAKEN' };
    }

    const user: StoredUser = {
      id: this.generateId(),
      fullName,
      email,
      phone,
      university,
      password
    };

    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    this.setSession(user);

    return { success: true };
  }

  login(email: string, password: string): ActionResult {
    const users = this.loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (!found) {
      return { success: false, message: 'AUTH.ERROR_INVALID_CREDENTIALS' };
    }

    this.setSession(found);
    return { success: true };
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.userSubject.next(null);
  }

  updateProfile(updates: { fullName?: string; phone?: string; university?: string }): ActionResult {
    const current = this.currentUser;

    if (!current) {
      return { success: false, message: 'AUTH.ERROR_NOT_LOGGED_IN' };
    }

    const users = this.loadUsers();
    const index = users.findIndex(u => u.id === current.id);

    if (index === -1) {
      return { success: false, message: 'AUTH.ERROR_ACCOUNT_NOT_FOUND' };
    }

    users[index] = { ...users[index], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    this.setSession(users[index]);

    return { success: true };
  }

  sendResetCode(email: string): SendCodeResult {
    const users = this.loadUsers();

    if (!users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'AUTH.ERROR_NO_ACCOUNT_EMAIL' };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const request: ResetRequest = {
      email: email.toLowerCase(),
      code,
      expires: Date.now() + 10 * 60 * 1000
    };

    localStorage.setItem(RESET_KEY, JSON.stringify(request));

    return { success: true, devCode: code };
  }

  verifyResetCode(email: string, code: string): ActionResult {
    const request = this.loadResetRequest();

    if (!request || request.email !== email.toLowerCase()) {
      return { success: false, message: 'AUTH.ERROR_NO_CODE_SENT' };
    }

    if (Date.now() > request.expires) {
      return { success: false, message: 'AUTH.ERROR_CODE_EXPIRED' };
    }

    if (request.code !== code) {
      return { success: false, message: 'AUTH.ERROR_CODE_INCORRECT' };
    }

    return { success: true };
  }

  resetPassword(email: string, code: string, newPassword: string): ActionResult {
    const verification = this.verifyResetCode(email, code);

    if (!verification.success) {
      return verification;
    }

    const users = this.loadUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (index === -1) {
      return { success: false, message: 'AUTH.ERROR_ACCOUNT_NOT_FOUND' };
    }

    users[index].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.removeItem(RESET_KEY);

    return { success: true };
  }

  private loadUsers(): StoredUser[] {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private loadResetRequest(): ResetRequest | null {
    const raw = localStorage.getItem(RESET_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private setSession(user: StoredUser): void {
    const { password, ...publicUser } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser));
    this.userSubject.next(publicUser);
  }

  private loadSession(): StudUser | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}
