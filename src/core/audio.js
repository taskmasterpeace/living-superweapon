// Living Superweapon — lightweight WebAudio synth SFX (no assets needed)
export class AudioBus {
  constructor() { this.ctx = null; this.master = null; this.ok = false; this.muted = false; }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      this.ok = true;
    } catch (e) { this.ok = false; }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  get t() { return this.ctx.currentTime; }

  _env(node, dur, peak = 1, atk = 0.005) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(peak, this.t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    node.connect(g); g.connect(this.master);
    return g;
  }
  _noise(dur) {
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf; return src;
  }

  blast(freq = 420, dur = 0.16, type = 'sawtooth') {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, this.t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.4, this.t + dur);
    this._env(o, dur, 0.5); o.start(); o.stop(this.t + dur + 0.02);
  }
  zap(freq = 900) {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(freq * (0.9 + Math.random() * 0.2), this.t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.6, this.t + 0.05);
    this._env(o, 0.06, 0.18); o.start(); o.stop(this.t + 0.08);
  }
  hit(freq = 240) {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(freq, this.t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, this.t + 0.09);
    this._env(o, 0.1, 0.4);
    const n = this._noise(0.08); this._env(n, 0.08, 0.25); n.start(); n.stop(this.t + 0.08);
    o.start(); o.stop(this.t + 0.12);
  }
  // heavy, violent melee impact — low thud + high crack
  impact(power = 1) {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(190, this.t);
    o.frequency.exponentialRampToValueAtTime(38, this.t + 0.12);
    this._env(o, 0.15, Math.min(0.95, 0.45 + power * 0.4), 0.002); o.start(); o.stop(this.t + 0.17);
    const o2 = this.ctx.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(90, this.t); o2.frequency.exponentialRampToValueAtTime(30, this.t + 0.08);
    this._env(o2, 0.09, 0.3 + power * 0.2, 0.001); o2.start(); o2.stop(this.t + 0.1);
    const n = this._noise(0.06); const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1400; n.connect(f);
    this._env(f, 0.05, 0.28 + power * 0.25, 0.001); n.start(); n.stop(this.t + 0.06);
  }

  boom(power = 1) {
    if (!this.ok || this.muted) return;
    const dur = 0.5 + power * 0.4;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, this.t);
    o.frequency.exponentialRampToValueAtTime(30, this.t + dur);
    this._env(o, dur, Math.min(0.9, 0.5 + power * 0.3), 0.01);
    const n = this._noise(dur); const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(1200, this.t);
    f.frequency.exponentialRampToValueAtTime(120, this.t + dur);
    n.connect(f); this._env(f, dur, 0.5, 0.005); n.start(); n.stop(this.t + dur);
    o.start(); o.stop(this.t + dur + 0.02);
  }
  charge() {
    if (!this.ok || this.muted) return null;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, this.t);
    o.frequency.linearRampToValueAtTime(520, this.t + 2.4);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(0.14, this.t + 0.3);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 4;
    o.connect(f); f.connect(g); g.connect(this.master); o.start();
    return {
      o, g, f,
      ramp: (lvl) => { try { f.frequency.setTargetAtTime(300 + lvl * 2600, this.t, 0.05); } catch (e) {} },
      stop: () => { try { g.gain.setTargetAtTime(0.0001, this.t, 0.05); o.stop(this.t + 0.3); } catch (e) {} },
    };
  }
  teleport() {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1200, this.t);
    o.frequency.exponentialRampToValueAtTime(180, this.t + 0.18);
    this._env(o, 0.2, 0.3); o.start(); o.stop(this.t + 0.22);
  }
  power(up = true) {
    if (!this.ok || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(up ? 200 : 600, this.t);
    o.frequency.exponentialRampToValueAtTime(up ? 700 : 120, this.t + 0.5);
    this._env(o, 0.6, 0.3, 0.02); o.start(); o.stop(this.t + 0.62);
  }
}
