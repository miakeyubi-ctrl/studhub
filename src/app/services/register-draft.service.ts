import { Injectable } from '@angular/core';

export type StudentRegisterStep = 'email' | 'otp' | 'name' | 'photo' | 'welcome';

export interface StudentRegisterDraft {
  kind: 'student';
  step: StudentRegisterStep;
  email: string;
  acceptTerms: boolean;
  otp: string[];
  otpSentEmail: string;
  otpExpireAt: number | null;
  otpResendAt: number | null;
  firstName: string;
  lastName: string;
  nationality: string;
  phone: string;
  city: string;
  university: string;
  accountCreated: boolean;
  welcomeName: string;
  updatedAt: number;
}

export interface AgentRegisterDraft {
  kind: 'agent';
  step: 1 | 2 | 3;
  firstName: string;
  lastName: string;
  /** @deprecated use firstName/lastName */
  fullName?: string;
  agencyName: string;
  email: string;
  phone: string;
  activityType: string;
  activityCity: string;
  acceptTerms: boolean;
  otp: string[];
  otpSentEmail: string;
  otpExpireAt: number | null;
  otpResendAt: number | null;
  updatedAt: number;
}

const STUDENT_KEY = 'studhub-register-draft-v1';
const AGENT_KEY = 'studhub-agent-register-draft-v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class RegisterDraftService {
  saveStudent(draft: Omit<StudentRegisterDraft, 'kind' | 'updatedAt'>): void {
    const payload: StudentRegisterDraft = {
      ...draft,
      kind: 'student',
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(STUDENT_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }

  loadStudent(): StudentRegisterDraft | null {
    const d = this.read<StudentRegisterDraft>(STUDENT_KEY, 'student');
    if (!d) return null;
    // Si un OTP a déjà été envoyé, on force l'étape otp même si step a glissé
    if (d.otpSentEmail && d.step === 'email') {
      return { ...d, step: 'otp' };
    }
    return d;
  }

  clearStudent(): void {
    try {
      localStorage.removeItem(STUDENT_KEY);
    } catch {
      /* ignore */
    }
  }

  hasStudentDraft(): boolean {
    const d = this.loadStudent();
    if (!d) return false;
    // OTP envoyé / étapes suivantes = reprise obligatoire au retour e-mail
    if (d.otpSentEmail) return true;
    if (d.step !== 'email') return true;
    return false;
  }

  saveAgent(draft: Omit<AgentRegisterDraft, 'kind' | 'updatedAt'>): void {
    const payload: AgentRegisterDraft = {
      ...draft,
      kind: 'agent',
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(AGENT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  loadAgent(): AgentRegisterDraft | null {
    const d = this.read<AgentRegisterDraft>(AGENT_KEY, 'agent');
    if (!d) return null;
    if (d.otpSentEmail && d.step === 1) {
      return { ...d, step: 2 };
    }
    return d;
  }

  clearAgent(): void {
    try {
      localStorage.removeItem(AGENT_KEY);
    } catch {
      /* ignore */
    }
  }

  hasAgentDraft(): boolean {
    const d = this.loadAgent();
    if (!d) return false;
    if (d.otpSentEmail) return true;
    if (d.step !== 1) return true;
    return false;
  }

  /** Route d'inscription à reprendre (priorité étudiant). */
  pendingRegisterRoute(): '/register' | '/agent-register' | null {
    const student = this.loadStudent();
    // Compte déjà créé : ne plus forcer le welcome « Passer » au retour app
    if (student?.accountCreated) {
      return null;
    }
    if (this.hasStudentDraft()) return '/register';
    if (this.hasAgentDraft()) return '/agent-register';
    return null;
  }

  private read<T extends { kind: string; updatedAt: number }>(
    key: string,
    kind: string,
  ): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw) as T;
      if (!data || data.kind !== kind || !data.updatedAt) return null;
      if (Date.now() - data.updatedAt > MAX_AGE_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }
}
