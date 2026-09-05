/** Tiny procedural sound effects using WebAudio — no assets required. */
type Ctx = AudioContext;

class Sfx {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  private tone(freq: number, endFreq: number, dur: number, type: OscillatorType, vol = 0.5) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.5, filterFreq = 1200, q = 1) {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filterFreq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  hit(heavy = false) {
    this.tone(heavy ? 160 : 220, 40, heavy ? 0.22 : 0.12, "square", 0.5);
    this.noise(heavy ? 0.18 : 0.1, 0.6, heavy ? 500 : 900, 0.8);
  }
  block() {
    this.tone(900, 500, 0.08, "triangle", 0.35);
    this.noise(0.06, 0.4, 3000, 2);
  }
  whoosh() {
    this.noise(0.12, 0.25, 1500, 0.6);
  }
  jump() {
    this.tone(200, 420, 0.12, "sine", 0.25);
  }
  land() {
    this.noise(0.08, 0.3, 300, 0.7);
  }
  fireball() {
    this.tone(120, 500, 0.3, "sawtooth", 0.3);
    this.noise(0.3, 0.35, 800, 0.5);
  }
  knockdown() {
    this.tone(120, 30, 0.35, "square", 0.6);
    this.noise(0.3, 0.7, 250, 0.6);
  }
  announce() {
    this.tone(90, 60, 0.5, "sawtooth", 0.5);
    this.tone(180, 120, 0.5, "square", 0.3);
  }
  fight() {
    this.tone(300, 600, 0.1, "square", 0.4);
    setTimeout(() => this.tone(600, 900, 0.18, "square", 0.4), 90);
  }
  ko() {
    this.tone(400, 40, 0.8, "sawtooth", 0.6);
    this.noise(0.6, 0.8, 200, 0.5);
  }
  fatality() {
    this.tone(60, 20, 1.2, "sawtooth", 0.8);
    this.noise(0.9, 0.9, 400, 0.4);
    setTimeout(() => this.noise(0.5, 0.7, 900, 0.5), 150);
  }
  select() {
    this.tone(660, 880, 0.08, "square", 0.3);
  }
  score() {
    this.tone(880, 1320, 0.1, "square", 0.2);
  }
  gameOver() {
    this.tone(220, 55, 1.4, "sawtooth", 0.5);
  }
}

export const sfx = new Sfx();
