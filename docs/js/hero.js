'use strict';
// ---------------------------------------------------------------------------
// The Hero: the persistent RPG character. Level, gear, bag, gems, crafting
// materials, skill loadout and passives all live here and are saved to
// localStorage. The in-zone Player entity is built from this each run.
// ---------------------------------------------------------------------------

const SAVE_KEY = 'nekromancer_hero_v1';
const SAVES_KEY = 'nekromancer_saves_v1';

// Named manual save slots (up to 20), separate from the rolling autosave.
const Saves = {
  MAX: 20,

  list() {
    try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || []; } catch (e) { return []; }
  },

  persist(arr) {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify(arr)); return true; } catch (e) { return false; }
  },

  add(name) {
    const arr = this.list();
    if (arr.length >= this.MAX) {
      UI.toast('All 20 save slots are full — delete one first', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    arr.push({
      name: (name || 'Save ' + (arr.length + 1)).slice(0, 24),
      date: new Date().toLocaleDateString(),
      level: Hero.level,
      data: Hero.snapshot()
    });
    if (this.persist(arr)) {
      UI.toast('Saved: ' + arr[arr.length - 1].name, '#6ff7c3');
      AudioSys.sfx('level');
    }
  },

  load(i) {
    const arr = this.list();
    const s = arr[i];
    if (!s) return;
    Hero.applySnapshot(s.data);
    UI.toast('Loaded: ' + s.name, '#6ff7c3');
    AudioSys.sfx('level');
    Game.toCamp();
  },

  remove(i) {
    const arr = this.list();
    const s = arr.splice(i, 1)[0];
    if (s) {
      this.persist(arr);
      UI.toast('Deleted save: ' + s.name, '#9a9080');
    }
  }
};

const Hero = {
  level: 1,
  xp: 0,
  gold: 0,
  mats: { parts: 0, dust: 0, crystal: 0, soul: 0 },
  gems: [],                 // [{type, tier}]
  bag: [],                  // unequipped items
  equipped: {},             // slot -> item
  loadout: ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null],
  passives: [null, null, null, null],
  zonesCleared: 0,          // count of lands beaten (unlocks the next)
  difficulty: 0,
  bestZone: 0,
  totalKills: 0,
  riftsCleared: 0,
  riftKeys: 0,
  artisans: { smith: 1, mystic: 1, jeweler: 1 },
  BAG_SIZE: 24,
  SAVE_VERSION: 2,   // v2: Epic rarity inserted at index 3

  fresh() {
    this.level = 1; this.xp = 0; this.gold = 0;
    this.mats = { parts: 0, dust: 0, crystal: 0, soul: 0 };
    this.gems = [];
    this.bag = [];
    this.equipped = {};
    this.loadout = ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null];
    this.passives = [null, null, null, null];
    this.zonesCleared = 0;
    this.difficulty = 0;
    this.bestZone = 0;
    this.totalKills = 0;
    this.riftsCleared = 0;
    this.riftKeys = 0;
    this.artisans = { smith: 1, mystic: 1, jeweler: 1 };
  },

  snapshot() {
    return {
      v: this.SAVE_VERSION,
      level: this.level, xp: this.xp, gold: this.gold, mats: this.mats,
      gems: this.gems, bag: this.bag, equipped: this.equipped,
      loadout: this.loadout, passives: this.passives,
      zonesCleared: this.zonesCleared, difficulty: this.difficulty,
      bestZone: this.bestZone, totalKills: this.totalKills,
      riftsCleared: this.riftsCleared, riftKeys: this.riftKeys,
      artisans: this.artisans
    };
  },

  // Older saves predate the Epic rarity (index 3): shift Legendary/Set up.
  migrate(d) {
    if ((d.v || 1) >= 2) return d;
    const fix = it => {
      if (!it) return;
      if (it.set) it.rarity = 5;
      else if (it.rarity >= 3) it.rarity = 4;
    };
    (d.bag || []).forEach(fix);
    for (const k of Object.keys(d.equipped || {})) fix(d.equipped[k]);
    d.v = 2;
    return d;
  },

  applySnapshot(d) {
    d = this.migrate(d);
    Object.assign(this, {
      level: d.level || 1, xp: d.xp || 0, gold: d.gold || 0,
      mats: Object.assign({ parts: 0, dust: 0, crystal: 0, soul: 0 }, d.mats),
      gems: d.gems || [], bag: d.bag || [], equipped: d.equipped || {},
      loadout: d.loadout || ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null],
      passives: d.passives || [null, null, null, null],
      zonesCleared: d.zonesCleared || 0, difficulty: d.difficulty || 0,
      bestZone: d.bestZone || 0, totalKills: d.totalKills || 0,
      riftsCleared: d.riftsCleared || 0, riftKeys: d.riftKeys || 0,
      artisans: Object.assign({ smith: 1, mystic: 1, jeweler: 1 }, d.artisans)
    });
    this.sanitize();
    this.save();
    Items.apply();
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.snapshot()));
    } catch (e) { /* storage unavailable */ }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      this.applySnapshot(JSON.parse(raw));
      return true;
    } catch (e) { return false; }
  },

  exists() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  },

  wipe() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    this.fresh();
  },

  // ------------------------------------------------------------ progression

  addXP(n) {
    if (this.level >= MAX_LEVEL) return;
    this.xp += Math.round(n);
    let leveled = false;
    while (this.level < MAX_LEVEL && this.xp >= XP_CURVE(this.level)) {
      this.xp -= XP_CURVE(this.level);
      this.level++;
      leveled = true;
    }
    if (leveled && Game.player) {
      Items.apply();
      const p = Game.player;
      p.hp = p.maxHp;
      p.essence = p.maxEssence;
      fxLevel(p.x, p.y);
      Particles.text(p.x, p.y - 46, 'LEVEL ' + this.level, { color: '#ffd76a', size: 22, life: 1.4 });
      AudioSys.sfx('level');
      const unlocked = SKILL_DATA.filter(s => s.lvl === this.level);
      for (const s of unlocked) UI.toast('Skill unlocked: ' + s.name, '#6ff7c3');
      const pUnlocked = PASSIVE_DATA.filter(s => s.lvl === this.level);
      for (const s of pUnlocked) UI.toast('Passive unlocked: ' + s.name, '#b06adf');
      if (PASSIVE_SLOT_LEVELS.includes(this.level)) UI.toast('Passive slot unlocked!', '#b06adf');
      this.save();
    }
  },

  // Cheat / testing helper: jump N levels instantly.
  grantLevels(n) {
    let gained = 0;
    while (n-- > 0 && this.level < MAX_LEVEL) {
      this.xp = 0;
      this.level++;
      gained++;
    }
    if (gained) {
      Items.apply();
      if (Game.player) {
        Game.player.hp = Game.player.maxHp;
        fxLevel(Game.player.x, Game.player.y);
      }
      UI.toast('+' + gained + ' level' + (gained > 1 ? 's' : '') + ' → ' + this.level, '#ffd76a');
      AudioSys.sfx('level');
      this.save();
    }
  },

  // Which Grace of Inarius pieces does the hero own (equipped or bagged)?
  setPiecesOwned() {
    const owned = new Set();
    const check = it => { if (it && it.set === 'inarius') owned.add(it.slot); };
    for (const slot of Object.keys(ITEM_SLOTS)) check(this.equipped[slot]);
    for (const it of this.bag) check(it);
    return owned;
  },

  passiveSlots() {
    return PASSIVE_SLOT_LEVELS.filter(l => this.level >= l).length;
  },

  hasPassive(id) {
    return this.passives.includes(id);
  },

  unlockedSkills() {
    return SKILL_DATA.filter(s => s.lvl <= this.level);
  },

  // Ensure the loadout only references unlocked skills.
  sanitize() {
    for (let i = 0; i < this.loadout.length; i++) {
      const id = this.loadout[i];
      if (id && !SKILL_DATA.some(s => s.id === id && s.lvl <= this.level)) this.loadout[i] = null;
    }
    if (!this.loadout[0]) this.loadout[0] = 'boneSpikes';
  }
};
