'use strict';
// ---------------------------------------------------------------------------
// Player settings — audio channel volumes/mutes and Diablo-Immortal-style
// gameplay options — persisted separately from the hero.
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'nekromancer_settings_v1';

const Settings = {
  audio: {
    master:   { v: 0.8, mute: false },
    sfx:      { v: 0.8, mute: false },
    music:    { v: 0.55, mute: false },
    ambience: { v: 0.6, mute: false },
    weather:  { v: 0.6, mute: false }
  },
  g: {
    dmgNumbers: true,     // floating damage text
    shake: true,          // camera shake
    healthBars: true,     // enemy health bars
    aimIndicator: true,   // targeting chevrons while aiming
    fixedJoy: false,      // fixed vs floating movement joystick
    lowFx: false,         // particle quality (low = half)
    bigMinimap: false,    // larger minimap
    showFps: false,
    corpseCap: 100        // corpses linger until this many exist (stress test)
  },

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      for (const k of Object.keys(this.audio)) {
        if (d.audio && d.audio[k]) Object.assign(this.audio[k], d.audio[k]);
      }
      if (d.g) Object.assign(this.g, d.g);
    } catch (e) { /* defaults */ }
  },

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ audio: this.audio, g: this.g }));
    } catch (e) { /* storage unavailable */ }
    this.applyAudio();
  },

  volume(channel) {
    const c = this.audio[channel];
    return c.mute ? 0 : c.v;
  },

  applyAudio() {
    AudioSys.setVolumes();
  }
};
