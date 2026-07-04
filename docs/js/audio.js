'use strict';
// ---------------------------------------------------------------------------
// WebAudio mixer. Five channels (master → sfx / music / ambience / weather).
// SFX + the fallback score are procedural; MUSIC prefers real files when they
// exist (see MUSIC_PLAYLIST). Per-zone ambience drones + weather loops too.
// All levels driven by Settings (master/music/etc. volume + mute).
// ---------------------------------------------------------------------------

// ===== MUSIC — drop your tracks here ======================================
// Tracks play SHUFFLED, on loop, forever (a random order that never repeats a
// track until the rest have played). Volume = Settings ▸ Master × Music (muting
// either silences it). If nothing loads, the built-in generative score plays.
//
// Each MUSIC_PLAYLIST entry can be EITHER:
//   • a bare filename ('1.mp3') — loaded from MUSIC_BASE_URL (or the repo's
//     docs/sounds/music/ if the base is ''), OR
//   • a FULL URL ('https://…/track.mp3') — used as-is, so you can host anywhere
//     (a GitHub Release, Cloudflare R2, Dropbox/Drive DIRECT-download links, …).
//
// RECOMMENDED for full-size tracks: a GitHub *Release* (free, big files OK,
// doesn't bloat the repo) — set MUSIC_BASE_URL to its download base:
//   const MUSIC_BASE_URL = 'https://github.com/nors3ai/Nekromancer/releases/download/music-v1/';
// (Google Drive works only via 'uc?export=download&id=…' DIRECT links and is
//  unreliable for big files — prefer a Release. See docs/sounds/README.md.)
const MUSIC_BASE_URL = '';
const MUSIC_PLAYLIST = [
  '1.mp3', '2.mp3', '3.mp3', '4.mp3', '5.mp3', '6.mp3', '7.mp3', '8.mp3',
  '9.mp3', '10.mp3', '11.mp3', '12.mp3', '13.mp3', '14.mp3', '15.mp3', '16.mp3'
];
// ==========================================================================

const AudioSys = {
  ctx: null,
  master: null,
  ch: {},               // sfx / music / ambience / weather gain nodes
  enabled: true,
  musicTimer: null,
  musicRoot: 110,
  musicEl: null,        // <audio> element for file music
  musicSrcNode: null,   // its MediaElementSource → music channel
  musicIndex: 0,        // absolute index into MUSIC_PLAYLIST of the current track
  musicOrder: null,     // shuffled play order (a "bag" reshuffled each cycle)
  musicPos: -1,
  usingFileMusic: false,
  musicMisses: 0,       // consecutive load failures (all → fall back to generative)
  ambienceNodes: null,
  weatherNodes: null,
  currentAmbience: null,
  currentWeather: null,

  // Must be called from a user gesture (tap/click) to satisfy autoplay rules.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const name of ['sfx', 'music', 'ambience', 'weather']) {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.ch[name] = g;
      }
      this.setVolumes();
      this.startMusic();
    } catch (e) {
      this.enabled = false;
    }
  },

  setVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(Settings.volume('master') * 0.6, t, 0.05);
    this.ch.sfx.gain.setTargetAtTime(Settings.volume('sfx'), t, 0.05);
    this.ch.music.gain.setTargetAtTime(Settings.volume('music'), t, 0.05);
    this.ch.ambience.gain.setTargetAtTime(Settings.volume('ambience'), t, 0.05);
    this.ch.weather.gain.setTargetAtTime(Settings.volume('weather'), t, 0.05);
    // File music plays on its own <audio> element (so external/CDN URLs work
    // without CORS issues) — drive it by Master × Music, muting either → 0.
    if (this.musicEl) this.musicEl.volume = this.fileMusicVolume();
  },

  fileMusicVolume() {
    return clamp(Settings.volume('master') * Settings.volume('music'), 0, 1);
  },

  now() { return this.ctx.currentTime; },

  env(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  },

  tone(type, freq, freqEnd, peak, attack, decay, delay = 0, channel = 'sfx') {
    if (!this.ctx || !this.enabled) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + attack + decay);
    this.env(g, t, peak, attack, decay);
    o.connect(g).connect(this.ch[channel] || this.master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  },

  noise(peak, attack, decay, filterFreq, filterEnd, delay = 0, channel = 'sfx') {
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
    src.connect(f).connect(g).connect(this.ch[channel] || this.master);
    src.start(t);
    src.stop(t + attack + decay + 0.05);
  },

  // ------------------------------------------------------------- music

  // Start music: prefer real files (MUSIC_PLAYLIST); the generative dirge below
  // runs only as a fallback when no files load.
  startMusic() {
    this.initFileMusic();
    if (this.musicTimer) return;
    const MINOR = [1, 1.189, 1.335, 1.498, 1.587, 1.782]; // aeolian-ish ratios
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (this.usingFileMusic) return;      // real tracks are playing — stay quiet
      if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
      if (Settings.volume('master') === 0 || Settings.volume('music') === 0) return;
      step++;
      const root = this.musicRoot;
      // Low drone every 4th step.
      if (step % 4 === 1) {
        this.tone('sine', root / 2, root / 2, 0.16, 1.6, 2.6, 0, 'music');
        this.tone('sine', root / 2 * 1.5, root / 2 * 1.5, 0.05, 1.8, 2.4, 0.2, 'music');
      }
      // A wandering note most steps.
      if (Math.random() < 0.8) {
        const f = root * pick(MINOR) * (Math.random() < 0.25 ? 2 : 1);
        this.tone('triangle', f, f * rand(0.995, 1.005), 0.07, rand(0.8, 1.6), rand(1.6, 2.6), rand(0, 0.5), 'music');
      }
      // A distant bell, rarely.
      if (Math.random() < 0.12) {
        const f = root * 4 * pick(MINOR);
        this.tone('sine', f, f, 0.04, 0.01, 2.8, rand(0, 1), 'music');
      }
    }, 2200);
  },

  // ----- file-based playlist (docs/sounds/music/) -----
  // Routed through the MUSIC channel so Settings ▸ Master × Music volume and
  // mute all apply automatically. Plays the list in order, on loop. If every
  // track fails to load (none present), we quietly fall back to the generative
  // score above.
  initFileMusic() {
    if (this.musicEl || !MUSIC_PLAYLIST.length) return;
    const el = new Audio();
    el.preload = 'auto';
    el.loop = false;                    // we advance manually to chain the list
    el.crossOrigin = 'anonymous';       // allow externally-hosted (Release/CDN) tracks
    el.volume = this.fileMusicVolume();
    el.addEventListener('ended', () => this.nextTrack());
    el.addEventListener('error', () => this.onTrackError());
    el.addEventListener('playing', () => { this.usingFileMusic = true; this.musicMisses = 0; });
    // NOTE: volume/mute are driven directly on the element (see setVolumes), NOT
    // through the WebAudio graph — a MediaElementSource would taint (and silence)
    // cross-origin tracks, and the tracks live on a Release for size reasons.
    this.musicEl = el;
    this.advanceMusic();
  },

  // Build a fresh SHUFFLED play order (a "bag"): every track plays once in a
  // random order, then the bag reshuffles — so it feels random and you never
  // know which is next, without repeating a track before the others have played.
  shuffleMusic() {
    const n = MUSIC_PLAYLIST.length;
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    // Don't let a fresh bag open with the track that just finished.
    if (n > 1 && order[0] === this.musicIndex) { const j = 1 + Math.floor(Math.random() * (n - 1)); [order[0], order[j]] = [order[j], order[0]]; }
    this.musicOrder = order;
    this.musicPos = -1;
  },

  advanceMusic() {
    if (!this.musicOrder || this.musicPos + 1 >= this.musicOrder.length) this.shuffleMusic();
    this.musicPos++;
    this.playTrack(this.musicOrder[this.musicPos]);
  },

  playTrack(i) {
    const el = this.musicEl;
    if (!el || !MUSIC_PLAYLIST.length) return;
    const n = MUSIC_PLAYLIST.length;
    this.musicIndex = ((i % n) + n) % n;
    const name = MUSIC_PLAYLIST[this.musicIndex];
    el.volume = this.fileMusicVolume();
    if (/^https?:\/\//i.test(name)) {
      el.src = name;                        // a full URL — use exactly as given
    } else {
      // A bare filename: prepend the base (or the repo folder). Local files get
      // a version cache-bust; external base URLs are versioned by their own path.
      const local = !MUSIC_BASE_URL;
      const bust = (local && typeof GAME_VERSION !== 'undefined') ? '?v=' + GAME_VERSION : '';
      el.src = (MUSIC_BASE_URL || 'sounds/music/') + name + bust;
    }
    const pr = el.play();
    if (pr && pr.catch) pr.catch(() => {});   // ignore autoplay rejections
  },

  nextTrack() { this.advanceMusic(); },

  // A track failed to load.
  //  · If nothing has ever played, there are no music files — give up after this
  //    single probe (one 404) and let the generative score play.
  //  · If music WAS playing, just this track is missing — skip to the next (but
  //    stop cycling if the whole rest of the list is gone).
  onTrackError() {
    this.musicMisses++;
    if (!this.usingFileMusic) { if (this.musicEl) this.musicEl.pause(); return; }
    if (this.musicMisses > MUSIC_PLAYLIST.length) {
      this.usingFileMusic = false;
      if (this.musicEl) this.musicEl.pause();
      return;
    }
    this.advanceMusic();
  },

  // --------------------------------------------------- ambience / weather

  makeLoop(build) {
    // Returns {gain, stop()} — a looping source chain into the given channel.
    const src = this.ctx.createBufferSource();
    const seconds = 2;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    src.loop = true;
    return build(src);
  },

  // ambienceKind: 'wilds' | 'crypt' | 'camp' | null
  setAmbience(kind) {
    if (!this.ctx || kind === this.currentAmbience) return;
    this.currentAmbience = kind;
    if (this.ambienceNodes) {
      this.ambienceNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { /* */ } });
      this.ambienceNodes = null;
    }
    if (!kind) return;
    const nodes = [];
    const t = this.now();
    // Wind / air bed.
    const bed = this.makeLoop(src => {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = kind === 'crypt' ? 220 : 480;
      const g = this.ctx.createGain();
      g.gain.value = kind === 'camp' ? 0.05 : 0.09;
      // Slow swell LFO.
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = kind === 'crypt' ? 0.07 : 0.13;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = kind === 'camp' ? 0.02 : 0.045;
      lfo.connect(lfoG).connect(g.gain);
      lfo.start(t);
      src.connect(f).connect(g).connect(this.ch.ambience);
      src.start(t);
      return { nodes: [src, lfo, g, f] };
    });
    nodes.push(...bed.nodes);
    // Crypt gets a deep drone.
    if (kind === 'crypt') {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 55;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      o.connect(g).connect(this.ch.ambience);
      o.start(t);
      nodes.push(o, g);
    }
    this.ambienceNodes = nodes;
  },

  // weatherKind: 'rain' | 'wind' | null
  setWeather(kind) {
    if (!this.ctx || kind === this.currentWeather) return;
    this.currentWeather = kind;
    if (this.weatherNodes) {
      this.weatherNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) { /* */ } });
      this.weatherNodes = null;
    }
    if (!kind) return;
    const t = this.now();
    const out = this.makeLoop(src => {
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      if (kind === 'rain') {
        f.type = 'highpass';
        f.frequency.value = 1600;
        g.gain.value = 0.10;
      } else {
        f.type = 'bandpass';
        f.frequency.value = 300;
        f.Q.value = 0.7;
        g.gain.value = 0.12;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.16;
        const lfoG = this.ctx.createGain();
        lfoG.gain.value = 160;
        lfo.connect(lfoG).connect(f.frequency);
        lfo.start(t);
        src.connect(f).connect(g).connect(this.ch.weather);
        src.start(t);
        return { nodes: [src, lfo, g, f] };
      }
      src.connect(f).connect(g).connect(this.ch.weather);
      src.start(t);
      return { nodes: [src, g, f] };
    });
    this.weatherNodes = out.nodes;
  },

  // ----------------------------------------------------------------- sfx

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
      case 'swing':
        this.noise(0.09, 0.006, 0.09, 2600, 500);
        break;
      case 'curse':
        this.tone('sine', 340, 120, 0.09, 0.03, 0.4);
        this.tone('sine', 452, 160, 0.06, 0.03, 0.4, 0.05);
        break;
      case 'siphon':
        this.tone('sawtooth', 90, 130, 0.05, 0.02, 0.12);
        break;
      case 'rush':
        this.noise(0.14, 0.01, 0.16, 1800, 200);
        this.tone('sine', 300, 90, 0.08, 0.01, 0.15);
        break;
      case 'spirit':
        this.tone('sine', 640, 220, 0.09, 0.05, 0.5);
        this.tone('sine', 960, 330, 0.05, 0.05, 0.5, 0.08);
        break;
      case 'devour':
        this.noise(0.1, 0.01, 0.2, 900, 200);
        this.tone('square', 140, 70, 0.07, 0.01, 0.2);
        break;
      case 'army':
        this.noise(0.24, 0.02, 0.7, 700, 90);
        this.tone('sawtooth', 70, 40, 0.18, 0.04, 0.8);
        this.tone('sawtooth', 105, 60, 0.12, 0.04, 0.8, 0.05);
        break;
      case 'potion':
        this.tone('sine', 300, 620, 0.09, 0.03, 0.25);
        this.noise(0.04, 0.02, 0.18, 1200, 2400);
        break;
      case 'craft':
        this.noise(0.12, 0.005, 0.1, 3000, 800);
        this.tone('square', 220, 220, 0.06, 0.005, 0.12, 0.06);
        this.noise(0.1, 0.005, 0.08, 2600, 700, 0.12);
        break;
      case 'gem':
        this.tone('sine', 880, 1320, 0.08, 0.008, 0.18);
        this.tone('sine', 1320, 1760, 0.06, 0.008, 0.22, 0.06);
        break;
      case 'chest':
        this.tone('square', 160, 90, 0.07, 0.01, 0.12);
        this.tone('sine', 660, 990, 0.07, 0.01, 0.3, 0.1);
        this.tone('sine', 880, 1320, 0.06, 0.01, 0.3, 0.18);
        break;
      case 'shrine':
        [392, 523, 659].forEach((f, i) => this.tone('triangle', f, f, 0.08, 0.02, 0.4, i * 0.07));
        break;
      case 'portal':
        this.tone('sawtooth', 60, 240, 0.12, 0.5, 0.6);
        this.noise(0.1, 0.4, 0.6, 400, 2000);
        break;
      case 'click':
        this.tone('square', 480, 400, 0.035, 0.003, 0.045);
        break;
      case 'tornado':
        this.noise(0.05, 0.02, 0.25, 1400, 400);
        break;
      case 'breakPot':
        this.noise(0.12, 0.004, 0.14, 3400, 900);
        this.tone('square', 620, 260, 0.05, 0.004, 0.09);
        break;
      case 'breakWood':
        this.noise(0.13, 0.005, 0.16, 1500, 300);
        this.tone('square', 180, 90, 0.07, 0.005, 0.12);
        this.noise(0.07, 0.005, 0.1, 2200, 500, 0.06);
        break;
      case 'breakStone':
        this.noise(0.16, 0.006, 0.22, 800, 120);
        this.tone('sine', 130, 50, 0.1, 0.006, 0.2);
        break;
      case 'setdrop':
        [392, 494, 587, 784, 988].forEach((f, i) =>
          this.tone('triangle', f, f, 0.1, 0.01, 0.5, i * 0.12));
        break;
    }
  }
};
