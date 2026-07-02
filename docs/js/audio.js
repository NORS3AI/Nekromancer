'use strict';
// ---------------------------------------------------------------------------
// Procedural WebAudio SFX — no assets, everything synthesized on the fly.
// ---------------------------------------------------------------------------

const AudioSys = {
  ctx: null,
  master: null,
  enabled: true,

  // Must be called from a user gesture (tap/click) to satisfy autoplay rules.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.enabled = false;
    }
  },

  now() { return this.ctx.currentTime; },

  env(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  },

  tone(type, freq, freqEnd, peak, attack, decay, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + attack + decay);
    this.env(g, t, peak, attack, decay);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  },

  noise(peak, attack, decay, filterFreq, filterEnd, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.now() + delay;
    const len = Math.ceil(this.ctx.sampleRate * (attack + decay + 0.05));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFreq, t);
    if (filterEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), t + attack + decay);
    const g = this.ctx.createGain();
    this.env(g, t, peak, attack, decay);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + attack + decay + 0.05);
  },

  sfx(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'shoot':
        this.noise(0.10, 0.005, 0.08, 3200, 700);
        this.tone('triangle', 720, 240, 0.07, 0.005, 0.07);
        break;
      case 'spear':
        this.noise(0.16, 0.01, 0.18, 2400, 300);
        this.tone('sawtooth', 190, 60, 0.12, 0.01, 0.22);
        break;
      case 'explode':
        this.noise(0.30, 0.01, 0.42, 900, 90);
        this.tone('sine', 110, 34, 0.24, 0.01, 0.4);
        break;
      case 'nova':
        this.tone('sawtooth', 90, 300, 0.14, 0.16, 0.28);
        this.noise(0.2, 0.12, 0.35, 500, 2400);
        break;
      case 'summon':
        this.tone('square', 140, 300, 0.07, 0.05, 0.3);
        this.tone('square', 210, 420, 0.05, 0.05, 0.3, 0.07);
        this.noise(0.06, 0.02, 0.25, 1400, 500);
        break;
      case 'hit':
        this.noise(0.12, 0.004, 0.07, 1800, 500);
        break;
      case 'hurt':
        this.tone('sawtooth', 170, 70, 0.16, 0.01, 0.22);
        this.noise(0.12, 0.01, 0.16, 800, 200);
        break;
      case 'die':
        this.tone('sawtooth', 220, 40, 0.2, 0.02, 0.9);
        this.noise(0.18, 0.02, 0.7, 600, 80);
        break;
      case 'gold':
        this.tone('sine', 1150, 1500, 0.08, 0.004, 0.09);
        this.tone('sine', 1720, 2100, 0.05, 0.004, 0.12, 0.05);
        break;
      case 'orb':
        this.tone('sine', 420, 840, 0.1, 0.02, 0.25);
        break;
      case 'level':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone('triangle', f, f, 0.11, 0.01, 0.3, i * 0.09));
        break;
      case 'wave':
        this.tone('sawtooth', 65, 62, 0.16, 0.05, 0.9);
        this.tone('sawtooth', 98, 92, 0.10, 0.05, 0.9, 0.02);
        break;
      case 'denied':
        this.tone('square', 180, 140, 0.06, 0.005, 0.08);
        break;
      case 'bolt':
        this.tone('sawtooth', 520, 180, 0.06, 0.01, 0.12);
        break;
    }
  }
};
