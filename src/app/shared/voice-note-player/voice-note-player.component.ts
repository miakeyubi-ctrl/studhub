import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

interface VoicePlayerHandle {
  pause(resetCursor?: boolean): void;
}

/** Un seul lecteur vocal actif à la fois (comme WhatsApp). */
let activePlayer: VoicePlayerHandle | null = null;

@Component({
  selector: 'app-voice-note-player',
  templateUrl: './voice-note-player.component.html',
  styleUrls: ['./voice-note-player.component.scss'],
  standalone: false,
})
export class VoiceNotePlayerComponent implements OnChanges, OnDestroy, VoicePlayerHandle {
  @Input() src = '';
  @Input() fromMe = false;

  @ViewChild('audioEl') audioRef?: ElementRef<HTMLAudioElement>;

  playing = false;
  current = 0;
  duration = 0;
  readonly bars = [
    0.35, 0.55, 0.8, 0.45, 0.95, 0.6, 0.4, 0.75, 0.5, 0.9,
    0.55, 0.7, 0.4, 0.85, 0.5, 0.65, 0.9, 0.45, 0.75, 0.55,
    0.4, 0.8, 0.6, 0.5, 0.7, 0.45, 0.85, 0.55,
  ];

  private raf = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && !changes['src'].firstChange) {
      this.reset();
    }
  }

  ngOnDestroy(): void {
    this.pause(true);
    if (activePlayer === this) activePlayer = null;
  }

  get progress(): number {
    if (!this.duration) return 0;
    return Math.min(1, this.current / this.duration);
  }

  get timeLabel(): string {
    const t = this.playing || this.current > 0 ? this.current : this.duration;
    return this.format(t || 0);
  }

  toggle(): void {
    if (this.playing) {
      this.pause();
      return;
    }
    void this.play();
  }

  async play(): Promise<void> {
    const audio = this.audioRef?.nativeElement;
    if (!audio || !this.src) return;

    if (activePlayer && activePlayer !== this) {
      activePlayer.pause(true);
    }
    activePlayer = this;

    try {
      // Vitesse normale (évite lecture accélérée après MediaRecorder)
      audio.playbackRate = 1;
      (audio as any).preservesPitch = true;
      if (!audio.getAttribute('src') || audio.src !== this.src) {
        audio.src = this.src;
        audio.load();
      }
      await audio.play();
      audio.playbackRate = 1;
      this.playing = true;
      this.tick();
    } catch {
      this.playing = false;
    }
  }

  pause(resetCursor = false): void {
    const audio = this.audioRef?.nativeElement;
    if (audio) {
      audio.pause();
      if (resetCursor) {
        audio.currentTime = 0;
        this.current = 0;
      }
    }
    this.playing = false;
    this.stopTick();
  }

  seek(event: MouseEvent | TouchEvent): void {
    const audio = this.audioRef?.nativeElement;
    const target = event.currentTarget as HTMLElement | null;
    if (!audio || !target || !this.duration) return;

    const rect = target.getBoundingClientRect();
    const clientX =
      'touches' in event
        ? event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX
        : event.clientX;
    if (clientX == null) return;

    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * this.duration;
    this.current = audio.currentTime;
  }

  onLoaded(): void {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;
    audio.playbackRate = 1;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      this.duration = audio.duration;
    }
  }

  onEnded(): void {
    this.playing = false;
    this.current = 0;
    this.stopTick();
    const audio = this.audioRef?.nativeElement;
    if (audio) audio.currentTime = 0;
  }

  onTimeUpdate(): void {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;
    // Garde la vitesse à 1 (certains WebView la modifient)
    if (audio.playbackRate !== 1) audio.playbackRate = 1;
    this.current = audio.currentTime || 0;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      this.duration = audio.duration;
    }
  }

  private tick(): void {
    this.stopTick();
    const loop = () => {
      this.onTimeUpdate();
      if (this.playing) {
        this.raf = requestAnimationFrame(loop);
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopTick(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private reset(): void {
    this.pause(true);
    this.duration = 0;
  }

  private format(total: number): string {
    const sec = Math.max(0, Math.floor(total || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
