class SoundService {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'triangle', gainVal = 0.14, endFreq?: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playMove() {
    this.playTone(220, 0.06, 'triangle', 0.16, 120);
  }

  playCapture() {
    this.playTone(320, 0.08, 'sawtooth', 0.12, 95);
  }

  playCheck() {
    this.playTone(580, 0.12, 'sine', 0.15, 440);
  }

  playCastle() {
    this.playTone(210, 0.05, 'triangle', 0.14, 130);
    setTimeout(() => this.playTone(260, 0.06, 'triangle', 0.14, 150), 75);
  }

  playBlunder() {
    this.playTone(190, 0.18, 'sawtooth', 0.1, 110);
  }

  playSuccess() {
    this.playTone(523.25, 0.1, 'sine', 0.12);
    setTimeout(() => this.playTone(659.25, 0.12, 'sine', 0.12), 90);
    setTimeout(() => this.playTone(783.99, 0.2, 'sine', 0.12), 180);
  }

  playGameOver() {
    this.playTone(392, 0.14, 'triangle', 0.13);
    setTimeout(() => this.playTone(329.63, 0.14, 'triangle', 0.13), 130);
    setTimeout(() => this.playTone(261.63, 0.28, 'triangle', 0.13), 260);
  }
}

export const soundService = new SoundService();
