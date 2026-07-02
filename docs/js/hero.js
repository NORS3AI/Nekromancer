'use strict';
// ---------------------------------------------------------------------------
// The Hero: the persistent RPG character. Level, gear, bag, gems, crafting
// materials, skill loadout and passives all live here and are saved to
// localStorage. The in-zone Player entity is built from this each run.
// ---------------------------------------------------------------------------

const SAVE_KEY = 'nekromancer_hero_v1';

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
  BAG_SIZE: 24,

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
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level: this.level, xp: this.xp, gold: this.gold, mats: this.mats,
        gems: this.gems, bag: this.bag, equipped: this.equipped,
        loadout: this.loadout, passives: this.passives,
        zonesCleared: this.zonesCleared, difficulty: this.difficulty,
        bestZone: this.bestZone, totalKills: this.totalKills
      }));
    } catch (e) { /* storage unavailable */ }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      Object.assign(this, {
        level: d.level || 1, xp: d.xp || 0, gold: d.gold || 0,
        mats: Object.assign({ parts: 0, dust: 0, crystal: 0, soul: 0 }, d.mats),
        gems: d.gems || [], bag: d.bag || [], equipped: d.equipped || {},
        loadout: d.loadout || ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null],
        passives: d.passives || [null, null, null, null],
        zonesCleared: d.zonesCleared || 0, difficulty: d.difficulty || 0,
        bestZone: d.bestZone || 0, totalKills: d.totalKills || 0
      });
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
