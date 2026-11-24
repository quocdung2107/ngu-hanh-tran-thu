// E4 — Âm thanh tổng hợp bằng WebAudio (không dùng file nhạc/nền nào).
// Khởi tạo lười (lazy) ở tương tác đầu tiên của người dùng; mọi lỗi đều được
// nuốt im lặng — game chạy bình thường khi trình duyệt không có WebAudio.
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastPlay = new Map<string, number>();
  muted = false;
  volume = 0.7;

  /** Gọi từ tương tác người dùng đầu tiên (click/phím) để mở khóa AudioContext. */
  unlock(): void {
    this.ensure();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(m ? 0 : this.volume, this.ctx.currentTime);
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx && !this.muted) this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
  }

  private ensure(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return true;
    }
    try {
      const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
        ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  private tone(freqFrom: number, freqTo: number, dur: number, type: OscillatorType, gain = 0.16, delay = 0): void {
    if (!this.ctx || !this.master) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(30, freqFrom), t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + dur);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch { /* bỏ qua lỗi âm thanh */ }
  }

  /** Phát một sự kiện âm thanh theo khóa (sim đẩy vào state.sounds, main xả hàng đợi mỗi frame). */
  play(key: string): void {
    if (this.muted) return;
    const now = performance.now();
    if (now - (this.lastPlay.get(key) ?? 0) < 45) return; // chống dội âm khi nhiều trụ cùng bắn
    this.lastPlay.set(key, now);
    if (!this.ensure() || !this.ctx) return;
    switch (key) {
      case 'attack:kim': this.tone(880, 620, 0.06, 'square', 0.07); break;
      case 'attack:moc': this.tone(280, 340, 0.08, 'sine', 0.10); break;
      case 'attack:thuy': this.tone(540, 360, 0.08, 'sine', 0.09); break;
      case 'attack:hoa': this.tone(190, 120, 0.09, 'sawtooth', 0.09); break;
      case 'attack:tho': this.tone(150, 90, 0.10, 'triangle', 0.12); break;
      case 'attack:hero': this.tone(700, 700, 0.05, 'square', 0.06); break;
      case 'aoe':
        this.tone(110, 640, 0.35, 'sawtooth', 0.14);
        this.tone(64, 40, 0.4, 'sine', 0.18);
        break;
      case 'death': this.tone(240, 55, 0.12, 'sine', 0.08); break;
      case 'centerHit': this.tone(115, 80, 0.15, 'square', 0.15); break;
      case 'build': this.tone(440, 660, 0.09, 'sine', 0.12); break;
      case 'destroy': this.tone(210, 55, 0.16, 'sawtooth', 0.11); break;
      case 'upgrade': this.tone(520, 520, 0.07, 'triangle', 0.12); this.tone(780, 780, 0.09, 'triangle', 0.12, 0.07); break;
      case 'skill': this.tone(600, 920, 0.12, 'triangle', 0.11); break;
      case 'waveStart':
        this.tone(330, 330, 0.09, 'square', 0.09);
        this.tone(440, 440, 0.09, 'square', 0.09, 0.1);
        this.tone(550, 550, 0.12, 'square', 0.09, 0.2);
        break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.14, 'triangle', 0.12, i * 0.11)); break;
      case 'lose': [392, 311, 233, 130].forEach((f, i) => this.tone(f, f, 0.18, 'sawtooth', 0.09, i * 0.14)); break;
      default: break;
    }
  }
}
