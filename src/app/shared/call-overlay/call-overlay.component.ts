import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CallService, CallState } from '../../services/call.service';

@Component({
  selector: 'app-call-overlay',
  templateUrl: './call-overlay.component.html',
  styleUrls: ['./call-overlay.component.scss'],
  standalone: false,
})
export class CallOverlayComponent implements OnInit, OnDestroy {
  state: CallState = {
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

  private sub?: Subscription;

  constructor(public calls: CallService) {}

  ngOnInit(): void {
    this.sub = this.calls.state$.subscribe((s) => (this.state = s));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get visible(): boolean {
    return this.state.phase !== 'idle';
  }

  get durationLabel(): string {
    const total = Math.max(0, this.state.elapsedSeconds || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get statusKey(): string {
    switch (this.state.phase) {
      case 'outgoing':
        return 'CALL.RINGING';
      case 'incoming':
        return 'CALL.INCOMING';
      case 'connecting':
        return 'CALL.CONNECTING';
      case 'active':
        if (this.state.onHold) return 'CALL.ON_HOLD';
        if (this.state.peerOnHold) return 'CALL.PEER_ON_HOLD';
        return '';
      case 'ended':
        return this.state.error || 'CALL.ENDED';
      default:
        return '';
    }
  }

  get peerMuteMessage(): string {
    if (this.state.phase !== 'active' || !this.state.peerMuted || this.state.peerOnHold) return '';
    return 'CALL.PEER_MIC_OFF';
  }

  get showInCallControls(): boolean {
    return (
      this.state.phase === 'outgoing' ||
      this.state.phase === 'connecting' ||
      this.state.phase === 'active'
    );
  }
}
