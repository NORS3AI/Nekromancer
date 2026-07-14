'use strict';
// ---------------------------------------------------------------------------
// Player settings — audio channel volumes/mutes and Diablo-Immortal-style
// gameplay options — persisted separately from the hero.
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'nekromancer_settings_v1';

// Rebindable desktop keyboard actions, in display order.
const KEY_ACTIONS = [
  ['moveUp', 'Move up'], ['moveDown', 'Move down'],
  ['moveLeft', 'Move left'], ['moveRight', 'Move right'],
  ['primary', 'Primary attack'],
  ['skill1', 'Skill 1'], ['skill2', 'Skill 2'], ['skill3', 'Skill 3'], ['skill4', 'Skill 4'],
  ['potion', 'Health potion'],
  ['portal', 'Town portal'],
  ['inventory', 'Inventory'], ['skills', 'Skills'],
  ['passives', 'Passives'], ['character', 'Character'],
  ['pause', 'Pause / back'], ['mute', 'Mute audio']
];

const KEY_DEFAULTS = {
  moveUp: ['KeyW', 'ArrowUp'], moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'], moveRight: ['KeyD', 'ArrowRight'],
  primary: ['Space', 'KeyJ'],
  skill1: ['Digit1'], skill2: ['Digit2'], skill3: ['Digit3'], skill4: ['Digit4'],
  potion: ['KeyQ'],
  portal: ['KeyT'],
  inventory: ['KeyI', 'KeyB'], skills: ['KeyK'],
  passives: ['KeyP'], character: ['KeyC'],
  pause: ['Escape'], mute: ['KeyM']
};

// A short, friendly label for a KeyboardEvent.code.
function keyName(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  const map = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Space: 'Space', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab', Backquote: '`',
    ShiftLeft: 'LShift', ShiftRight: 'RShift', ControlLeft: 'LCtrl',
    ControlRight: 'RCtrl', AltLeft: 'LAlt', AltRight: 'RAlt',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';'
  };
  return map[code] || code;
}

const Settings = {
  audio: {
    master:   { v: 0.8, mute: false },
    sfx:      { v: 0.8, mute: false },
    music:    { v: 0.55, mute: false },
    ambience: { v: 0.6, mute: false },
    weather:  { v: 0.6, mute: true }
  },
  g: {
    theme: 'bone',        // UI chrome theme (THEMES in data.js) — set at the Mystic
    electiveMode: false,  // allow more than one skill per category on the action bar
    invGrouped: false,    // inventory layout: false = radial wheel · true = grouped list
    dmgNumbers: true,     // floating damage text (red hit / yellow crit / green heal)
    shake: true,          // camera shake
    healthBars: true,     // enemy health bars
    aimIndicator: true,   // targeting chevrons while aiming
    fixedJoy: false,      // fixed vs floating movement joystick
    lowFx: false,         // particle quality (low = half)
    bigMinimap: false,    // larger minimap
    showFps: false,
    lootPos: 'bottom',    // loot announcement anchor: top | middle | bottom
    lootStyle: 'line',    // loot announcement layout: line | arc
    dpsMeter: false,      // show the DPS meter (under the minimap by default)
    dpsLocked: true,      // lock the DPS meter's position
    dpsX: null, dpsY: null, // custom DPS meter position (null = default)
    corpseCap: 100,       // corpses linger until this many exist (stress test)
    cursorScale: 1,       // bone-hand mouse cursor size: 1× / 2× / 3×
    mono: false,          // fold WebAudio output to one channel (single/mono speaker)
    fontSize: 13,         // global UI font size (8–22); scales all text via ctx.font
    viewMode: 'birdseye'  // camera: 'birdseye' (straight down) | 'topdown' (D3-style tilt + zoom)
  },
  keys: JSON.parse(JSON.stringify(KEY_DEFAULTS)),  // action -> [KeyboardEvent.code]
  _codeToAction: {},

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        for (const k of Object.keys(this.audio)) {
          if (d.audio && d.audio[k]) Object.assign(this.audio[k], d.audio[k]);
        }
        if (d.g) Object.assign(this.g, d.g);
        this.keys = JSON.parse(JSON.stringify(KEY_DEFAULTS));
        if (d.keys) {
          for (const a of Object.keys(KEY_DEFAULTS)) {
            if (Array.isArray(d.keys[a])) this.keys[a] = d.keys[a].slice();
          }
        }
      }
    } catch (e) { /* defaults */ }
    // Movement must never break: guarantee WASD + arrows always drive the four
    // move actions, even if a stray rebind stole one. Reclaim each default from
    // any other action, then ensure it's present (custom extra move keys kept).
    const moveActions = ['moveUp', 'moveDown', 'moveLeft', 'moveRight'];
    for (const a of moveActions) if (!Array.isArray(this.keys[a])) this.keys[a] = [];
    for (const a of moveActions) {
      for (const code of KEY_DEFAULTS[a]) {
        for (const other of Object.keys(this.keys)) {
          if (other !== a) this.keys[other] = this.keys[other].filter(c => c !== code);
        }
        if (!this.keys[a].includes(code)) this.keys[a].push(code);
      }
    }
    this.rebuildKeyMap();
  },

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY,
        JSON.stringify({ audio: this.audio, g: this.g, keys: this.keys }));
    } catch (e) { /* storage unavailable */ }
    this.applyAudio();
  },

  // ---------------------------------------------------------- keybindings

  rebuildKeyMap() {
    const m = {};
    for (const [action, codes] of Object.entries(this.keys)) {
      for (const c of codes) m[c] = action;
    }
    this._codeToAction = m;
  },

  actionFor(code) {
    return this._codeToAction[code] || null;
  },

  bindKey(action, code) {
    // The default movement keys are sacred: load() force-reclaims WASD/arrows
    // for the move actions on every boot, so letting another action steal one
    // here would break movement for the session and then be silently undone on
    // reload. Refuse up front instead (unless it's a move action reclaiming it).
    const moveActions = ['moveUp', 'moveDown', 'moveLeft', 'moveRight'];
    const isMoveDefault = moveActions.some(a => KEY_DEFAULTS[a].includes(code));
    if (isMoveDefault && !moveActions.includes(action)) {
      if (typeof UI !== 'undefined') UI.toast('That key drives movement — pick another', '#e04a5a');
      if (typeof AudioSys !== 'undefined') AudioSys.sfx('denied');
      return false;
    }
    for (const a of Object.keys(this.keys)) {          // a code maps to one action
      this.keys[a] = this.keys[a].filter(c => c !== code);
    }
    if (!this.keys[action]) this.keys[action] = [];
    this.keys[action].push(code);
    this.rebuildKeyMap();
    this.save();
    return true;
  },

  unbindKey(action, code) {
    if (this.keys[action]) this.keys[action] = this.keys[action].filter(c => c !== code);
    this.rebuildKeyMap();
    this.save();
  },

  resetKeys() {
    this.keys = JSON.parse(JSON.stringify(KEY_DEFAULTS));
    this.rebuildKeyMap();
    this.save();
  },

  volume(channel) {
    const c = this.audio[channel];
    return c.mute ? 0 : c.v;
  },

  applyAudio() {
    AudioSys.setVolumes();
    AudioSys.applyOutputRouting();
  }
};
