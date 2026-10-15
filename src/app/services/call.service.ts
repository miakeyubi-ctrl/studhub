import { Injectable, NgZone } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { IncomingCallWake } from '../plugins/incoming-call-wake';
import { ActiveRoleService } from './active-role.service';
import { AgentAuthService } from './agent-auth.service';
import { AuthService } from './auth.service';
import { MessagesService } from './messages.service';

export type CallPhase =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended';

export interface CallState {
  phase: CallPhase;
  conversationId: number | null;
  peerName: string;
  muted: boolean;
  peerMuted: boolean;
  onHold: boolean;
  peerOnHold: boolean;
  speakerOn: boolean;
  /** Point de vue local : out = j'ai lancé l'appel, in = j'ai reçu */
  direction: 'in' | 'out' | null;
  elapsedSeconds: number;
  error: string | null;
}

export type StartCallResult = 'ok' | 'offline' | 'busy' | 'no-socket' | 'mic-denied';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN public (nécessaire entre 2 mobiles / NAT symétrique)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const initialState: CallState = {
  phase: 'idle',
  conversationId: null,
  peerName: '',
  muted: false,
  peerMuted: false,
  onHold: false,
  peerOnHold: false,
  speakerOn: true,
  direction: null,
  elapsedSeconds: 0,
  error: null,
};

/**
 * Appels audio WebRTC via signaling Nest/Socket.IO.
 */
@Injectable({ providedIn: 'root' })
export class CallService {
  private readonly _state$ = new BehaviorSubject<CallState>(initialState);
  readonly state$ = this._state$.asObservable();

  get snapshot(): CallState {
    return this._state$.value;
  }

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private signalSub?: Subscription;
  private makingOffer = false;
  private callStartedAt: number | null = null;
  private tickTimer?: ReturnType<typeof setInterval>;
  private ringTimer?: ReturnType<typeof setTimeout>;
  private ringLoop?: ReturnType<typeof setInterval>;
  private disconnectGrace?: ReturnType<typeof setTimeout>;
  private ringAudioCtx: AudioContext | null = null;

  constructor(
    private messages: MessagesService,
    private zone: NgZone,
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private activeRole: ActiveRoleService,
  ) {
    this.signalSub = this.messages.signal$.subscribe(({ event, data }) => {
      void this.onSignal(event, data);
    });
    this.bindNativeIncomingBridge();
  }

  /**
   * Appel depuis une push FCM / écran natif (téléphone en veille).
   * Met l'UI en « incoming » et reconnecte le socket.
   */
  async handleIncomingFromPush(opts: {
    conversationId: number;
    fromName?: string;
    autoAccept?: boolean;
  }): Promise<void> {
    const conversationId = Number(opts.conversationId);
    if (!conversationId) return;

    await this.messages.ensureRealtime();
    this.messages.joinConversation(conversationId);

    if (this.snapshot.phase === 'idle' || this.snapshot.phase === 'ended') {
      this.patch({
        phase: 'incoming',
        conversationId,
        peerName: opts.fromName || 'Contact',
        muted: false,
        peerMuted: false,
        onHold: false,
        peerOnHold: false,
        speakerOn: true,
        direction: 'in',
        elapsedSeconds: 0,
        error: null,
      });
      this.startRingTone(false);
      await this.showWakeUi(opts.fromName || 'Contact', conversationId);
    }

    if (opts.autoAccept) {
      await this.acceptIncoming();
    }
  }

  async startCall(conversationId: number, peerName: string): Promise<StartCallResult> {
    if (this.snapshot.phase !== 'idle') return 'busy';

    await this.messages.ensureRealtime();
    if (!this.messages.isRealtimeConnected) return 'no-socket';

    // Ne bloque plus si le pair est « offline » : le push peut réveiller son téléphone
    void this.messages.waitForPeerPresence(conversationId, 1500);

    try {
      await this.ensureLocalMedia();
    } catch {
      return 'mic-denied';
    }

    this.patch({
      phase: 'outgoing',
      conversationId,
      peerName: peerName || 'Contact',
      muted: false,
      peerMuted: false,
      onHold: false,
      peerOnHold: false,
      speakerOn: true,
      direction: 'out',
      elapsedSeconds: 0,
      error: null,
    });
    this.messages.emitSignal('call:invite', {
      conversationId,
      fromName: this.callerDisplayName(),
    });
    this.startRingTone(true);
    this.armRingTimeout();
    return 'ok';
  }

  private callerDisplayName(): string {
    if (this.activeRole.preferAgent()) {
      const a = this.agentAuth.currentAgent;
      return a?.fullName || a?.agencyName || 'Agent';
    }
    return this.auth.currentUser?.fullName || 'StudHub';
  }

  async acceptIncoming(): Promise<void> {
    const { conversationId, phase } = this.snapshot;
    if (phase !== 'incoming' || !conversationId) return;
    this.stopRingTone();
    this.clearRingTimeout();
    await this.dismissWakeUi();
    this.patch({ phase: 'connecting', error: null });
    try {
      await this.ensurePeerConnection();
      this.messages.emitSignal('call:accept', { conversationId });
      if (this.pendingOffer) {
        const sdp = this.pendingOffer;
        this.pendingOffer = null;
        await this.onRemoteOffer(sdp);
      }
    } catch {
      this.patch({ error: 'CALL.MIC_DENIED' });
      this.messages.emitSignal('call:reject', { conversationId });
      this.reset('ended');
    }
  }

  rejectIncoming(): void {
    const { conversationId } = this.snapshot;
    if (!conversationId) return;
    this.stopRingTone();
    void this.dismissWakeUi();
    this.messages.emitSignal('call:reject', { conversationId });
    void this.messages.logCallEvent(conversationId, 'rejected', 0, 'in');
    this.reset('ended');
  }

  hangUp(): void {
    const { conversationId, phase, elapsedSeconds, direction } = this.snapshot;
    if (!conversationId || phase === 'idle' || phase === 'ended') {
      this.reset('ended');
      return;
    }

    const dir = direction || (phase === 'outgoing' ? 'out' : 'in');
    const status = phase === 'active' ? 'completed' : 'cancelled';
    const duration = phase === 'active' ? elapsedSeconds : 0;

    this.messages.emitSignal('call:end', { conversationId });
    void this.messages.logCallEvent(conversationId, status, duration, dir);
    this.reset('ended');
  }

  toggleMute(): void {
    if (this.snapshot.onHold) return;
    const nextMuted = !this.snapshot.muted;
    this.applyLocalMute(nextMuted);
    this.patch({ muted: nextMuted });
    const { conversationId } = this.snapshot;
    if (conversationId) {
      this.messages.emitSignal('call:mute', {
        conversationId,
        muted: nextMuted,
        fromName: this.callerDisplayName(),
      });
    }
  }

  toggleHold(): void {
    const next = !this.snapshot.onHold;
    // En attente : coupe le micro sortant + met le distant en silence localement
    this.applyLocalMute(next || this.snapshot.muted);
    if (this.remoteAudio) {
      this.remoteAudio.muted = next || false;
      if (!next) {
        this.remoteAudio.volume = this.snapshot.speakerOn ? 1 : 0.35;
      }
    }
    this.patch({ onHold: next });
    const { conversationId } = this.snapshot;
    if (conversationId) {
      this.messages.emitSignal('call:hold', {
        conversationId,
        onHold: next,
        fromName: this.callerDisplayName(),
      });
    }
  }

  toggleSpeaker(): void {
    const next = !this.snapshot.speakerOn;
    this.patch({ speakerOn: next });
    if (this.remoteAudio && !this.snapshot.onHold && !this.snapshot.peerOnHold) {
      this.remoteAudio.volume = next ? 1 : 0.35;
      void this.applyAudioOutput(this.remoteAudio, next);
    }
  }

  private applyLocalMute(muted: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
    if (this.pc) {
      for (const sender of this.pc.getSenders()) {
        if (sender.track?.kind === 'audio') {
          sender.track.enabled = !muted;
        }
      }
    }
  }

  private async onSignal(event: string, data: any): Promise<void> {
    const conversationId = Number(data?.conversationId);
    switch (event) {
      case 'call:incoming':
        if (this.snapshot.phase !== 'idle') {
          this.messages.emitSignal('call:reject', { conversationId });
          return;
        }
        this.patch({
          phase: 'incoming',
          conversationId,
          peerName: data?.fromName || 'Contact',
          muted: false,
          peerMuted: false,
          onHold: false,
          peerOnHold: false,
          speakerOn: true,
          direction: 'in',
          elapsedSeconds: 0,
          error: null,
        });
        this.startRingTone(false);
        await this.showWakeUi(data?.fromName || 'Contact', conversationId);
        break;

      case 'call:accepted':
        if (this.snapshot.phase !== 'outgoing') return;
        this.stopRingTone();
        this.clearRingTimeout();
        this.patch({ phase: 'connecting' });
        try {
          await this.ensurePeerConnection();
          await this.createAndSendOffer();
        } catch {
          this.patch({ error: 'CALL.MIC_DENIED' });
          this.reset('ended');
        }
        break;

      case 'call:rejected':
        this.patch({ error: 'CALL.REJECTED' });
        this.reset('ended');
        break;

      case 'call:offer':
        if (this.snapshot.phase === 'incoming' || this.snapshot.phase === 'idle') {
          // Offre arrivée avant accept → on la garde
          this.pendingOffer = data?.sdp || null;
          return;
        }
        await this.onRemoteOffer(data?.sdp);
        break;

      case 'call:answer':
        await this.onRemoteAnswer(data?.sdp);
        break;

      case 'call:ice':
        await this.onRemoteIce(data?.candidate);
        break;

      case 'call:peer-mute':
        if (!this.isSameCall(conversationId)) return;
        this.patch({
          peerMuted: !!data?.muted,
          peerName: data?.fromName || this.snapshot.peerName,
        });
        break;

      case 'call:peer-hold':
        if (!this.isSameCall(conversationId)) return;
        this.patch({
          peerOnHold: !!data?.onHold,
          peerName: data?.fromName || this.snapshot.peerName,
        });
        if (this.remoteAudio) {
          this.remoteAudio.muted = !!data?.onHold || this.snapshot.onHold;
        }
        break;

      case 'call:ended':
        this.reset('ended');
        break;
    }
  }

  private isSameCall(conversationId: number): boolean {
    if (this.snapshot.phase === 'idle' || this.snapshot.phase === 'ended') return false;
    if (
      this.snapshot.conversationId &&
      conversationId &&
      this.snapshot.conversationId !== conversationId
    ) {
      return false;
    }
    return true;
  }

  private async ensureLocalMedia(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    return this.localStream;
  }

  private async ensurePeerConnection(): Promise<void> {
    await this.ensureLocalMedia();
    if (this.pc) return;

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    for (const track of this.localStream!.getAudioTracks()) {
      this.pc.addTrack(track, this.localStream!);
    }

    this.pc.onicecandidate = (ev) => {
      if (!ev.candidate || !this.snapshot.conversationId) return;
      this.messages.emitSignal('call:ice', {
        conversationId: this.snapshot.conversationId,
        candidate: ev.candidate.toJSON(),
      });
    };

    this.pc.ontrack = (ev) => {
      this.zone.run(() => {
        this.attachRemoteStream(ev.streams[0] || new MediaStream([ev.track]));
        this.markActive();
      });
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === 'connected') {
        if (this.disconnectGrace) {
          clearTimeout(this.disconnectGrace);
          this.disconnectGrace = undefined;
        }
        this.zone.run(() => this.markActive());
      }
      if (state === 'failed') {
        this.zone.run(() => {
          this.patch({ error: 'CALL.ENDED' });
          this.reset('ended');
        });
      }
      if (state === 'disconnected') {
        // Court flottement ICE — ne pas raccrocher tout de suite
        if (this.disconnectGrace) clearTimeout(this.disconnectGrace);
        this.disconnectGrace = setTimeout(() => {
          if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'failed') {
            this.zone.run(() => this.reset('ended'));
          }
        }, 8000);
      }
      if (state === 'closed') {
        this.zone.run(() => this.reset('ended'));
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc?.iceConnectionState === 'connected' || this.pc?.iceConnectionState === 'completed') {
        this.zone.run(() => this.markActive());
      }
    };
  }

  private attachRemoteStream(stream: MediaStream): void {
    if (!this.remoteAudio) {
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;
      (this.remoteAudio as any).playsInline = true;
      this.remoteAudio.setAttribute('playsinline', 'true');
    }
    this.remoteAudio.srcObject = stream;
    this.remoteAudio.muted = this.snapshot.onHold || this.snapshot.peerOnHold;
    this.remoteAudio.volume = this.snapshot.speakerOn ? 1 : 0.35;
    void this.remoteAudio.play().catch(() => {
      // Retry après gesture utilisateur déjà faite (accept)
      setTimeout(() => void this.remoteAudio?.play().catch(() => {}), 300);
    });
    void this.applyAudioOutput(this.remoteAudio, this.snapshot.speakerOn);
  }

  private async applyAudioOutput(el: HTMLAudioElement, speakerOn: boolean): Promise<void> {
    const anyEl = el as any;
    if (typeof anyEl.setSinkId !== 'function') return;
    try {
      // '' = sortie par défaut (souvent haut-parleur / casque branché)
      await anyEl.setSinkId('');
      el.volume = speakerOn ? 1 : 0.35;
    } catch {
      /* ignore */
    }
  }

  private markActive(): void {
    if (this.snapshot.phase === 'active') return;
    this.stopRingTone();
    this.patch({ phase: 'active' });
    this.startTimer();
    if (this.snapshot.muted && this.snapshot.conversationId) {
      this.messages.emitSignal('call:mute', {
        conversationId: this.snapshot.conversationId,
        muted: true,
        fromName: this.callerDisplayName(),
      });
    }
  }

  private startTimer(): void {
    if (this.callStartedAt) return;
    this.callStartedAt = Date.now();
    this.patch({ elapsedSeconds: 0 });
    this.clearTicker();
    this.tickTimer = setInterval(() => {
      if (!this.callStartedAt) return;
      const sec = Math.floor((Date.now() - this.callStartedAt) / 1000);
      this.zone.run(() => this.patch({ elapsedSeconds: sec }));
    }, 1000);
  }

  private clearTicker(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
  }

  private armRingTimeout(): void {
    this.clearRingTimeout();
    this.ringTimer = setTimeout(() => {
      if (this.snapshot.phase === 'outgoing') {
        const conversationId = this.snapshot.conversationId;
        this.patch({ error: 'CALL.NO_ANSWER' });
        if (conversationId) {
          this.messages.emitSignal('call:end', { conversationId });
          void this.messages.logCallEvent(conversationId, 'missed', 0, 'out');
        }
        this.reset('ended');
      }
    }, 45000);
  }

  private clearRingTimeout(): void {
    if (this.ringTimer) {
      clearTimeout(this.ringTimer);
      this.ringTimer = undefined;
    }
  }

  private async createAndSendOffer(): Promise<void> {
    if (!this.pc || !this.snapshot.conversationId) return;
    this.makingOffer = true;
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await this.pc.setLocalDescription(offer);
      this.messages.emitSignal('call:offer', {
        conversationId: this.snapshot.conversationId,
        sdp: this.pc.localDescription,
      });
    } finally {
      this.makingOffer = false;
    }
  }

  private async onRemoteOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!sdp) return;
    if (this.snapshot.phase === 'idle') return;
    await this.ensurePeerConnection();
    if (!this.pc) return;
    if (this.pc.signalingState !== 'stable' && this.pc.signalingState !== 'have-local-offer') {
      // déjà en cours
    }
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    await this.flushPendingIce();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.messages.emitSignal('call:answer', {
      conversationId: this.snapshot.conversationId,
      sdp: this.pc.localDescription,
    });
  }

  private async onRemoteAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc || !sdp) return;
    if (this.pc.signalingState === 'stable') return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    await this.flushPendingIce();
  }

  private async onRemoteIce(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate) return;
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingIce.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      /* ignore bad candidates */
    }
  }

  private async flushPendingIce(): Promise<void> {
    if (!this.pc) return;
    const batch = [...this.pendingIce];
    this.pendingIce = [];
    for (const c of batch) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore */
      }
    }
  }

  private patch(partial: Partial<CallState>): void {
    this._state$.next({ ...this._state$.value, ...partial });
  }

  private reset(phase: CallPhase = 'idle'): void {
    this.stopRingTone();
    this.clearRingTimeout();
    this.clearTicker();
    void this.dismissWakeUi();
    if (this.disconnectGrace) {
      clearTimeout(this.disconnectGrace);
      this.disconnectGrace = undefined;
    }
    this.callStartedAt = null;
    try {
      this.pc?.close();
    } catch {}
    this.pc = null;
    this.pendingIce = [];
    this.pendingOffer = null;
    this.makingOffer = false;
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }
    this.patch({
      phase,
      conversationId: phase === 'idle' ? null : this._state$.value.conversationId,
      muted: false,
      peerMuted: false,
      onHold: false,
      peerOnHold: false,
      speakerOn: true,
      direction: phase === 'idle' ? null : this._state$.value.direction,
      elapsedSeconds: this._state$.value.elapsedSeconds,
      error: phase === 'ended' ? this._state$.value.error : null,
    });
    if (phase === 'ended') {
      setTimeout(() => {
        if (this._state$.value.phase === 'ended') {
          this.patch({ ...initialState });
        }
      }, 1400);
    }
  }

  private bindNativeIncomingBridge(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('studhubIncomingCall', ((ev: CustomEvent) => {
      const detail = (ev as any)?.detail || (ev as any);
      const conversationId = Number(detail?.conversationId || 0);
      if (!conversationId) return;
      this.zone.run(() => {
        void (async () => {
          if (detail?.declineCall) {
            await this.handleIncomingFromPush({
              conversationId,
              fromName: detail?.callerName || 'Contact',
            });
            this.rejectIncoming();
            await this.dismissWakeUi();
            return;
          }
          await this.handleIncomingFromPush({
            conversationId,
            fromName: detail?.callerName || 'Contact',
            autoAccept: !!detail?.acceptCall,
          });
        })();
      });
    }) as EventListener);

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && this.snapshot.phase === 'incoming') {
          void this.dismissWakeUi();
        }
      }).catch(() => undefined);
    }
  }

  private async showWakeUi(callerName: string, conversationId: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const hidden =
      typeof document !== 'undefined' &&
      (document.hidden || document.visibilityState === 'hidden');
    // Toujours tenter en natif : réveille aussi si l'écran s'éteint pendant la sonnerie
    if (!hidden && Capacitor.getPlatform() === 'web') return;
    try {
      await IncomingCallWake.show({ callerName, conversationId });
    } catch {
      /* plugin absent / web */
    }
  }

  private async dismissWakeUi(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await IncomingCallWake.dismiss();
    } catch {
      /* ignore */
    }
  }

  /** Sonnerie / tonalité d'attente en boucle. */
  private startRingTone(outgoing: boolean): void {
    this.stopRingTone();
    this.playRingBurst(outgoing);
    this.ringLoop = setInterval(() => this.playRingBurst(outgoing), outgoing ? 3200 : 2800);
  }

  private stopRingTone(): void {
    if (this.ringLoop) {
      clearInterval(this.ringLoop);
      this.ringLoop = undefined;
    }
    try {
      void this.ringAudioCtx?.close();
    } catch {}
    this.ringAudioCtx = null;
  }

  private playRingBurst(outgoing: boolean): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ringAudioCtx || this.ringAudioCtx.state === 'closed') {
        this.ringAudioCtx = new AudioCtx();
      }
      const ctx = this.ringAudioCtx!;
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      const freqs = outgoing ? [440, 480] : [740, 880];
      const beep = (start: number, freq: number, dur = 0.35) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.09, now + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      };
      if (outgoing) {
        beep(0, freqs[0], 0.9);
        beep(0, freqs[1], 0.9);
        beep(1.5, freqs[0], 0.9);
        beep(1.5, freqs[1], 0.9);
      } else {
        beep(0, freqs[0]);
        beep(0.45, freqs[1]);
      }
    } catch {
      /* ignore */
    }
  }
}
