import { registerPlugin } from '@capacitor/core';

export interface IncomingCallWakePlugin {
  show(options: { callerName: string; conversationId: number }): Promise<void>;
  dismiss(): Promise<void>;
  requestFullScreenPermission(): Promise<{ ok: boolean }>;
}

export const IncomingCallWake = registerPlugin<IncomingCallWakePlugin>('IncomingCallWake', {
  web: () => ({
    async show() { /* no-op web */ },
    async dismiss() { /* no-op web */ },
    async requestFullScreenPermission() { return { ok: false }; },
  }),
});
