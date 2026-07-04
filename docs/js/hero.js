'use strict';
// ---------------------------------------------------------------------------
// The Hero: the persistent RPG character. Level, gear, bag, gems, crafting
// materials, skill loadout and passives all live here and are saved to
// localStorage. The in-zone Player entity is built from this each run.
// ---------------------------------------------------------------------------

const SAVE_KEY = 'nekromancer_hero_v1';
const SAVES_KEY = 'nekromancer_saves_v1';
// Up to 3 concurrent character profiles (Diablo-style roster). The active
// character mirrors to SAVE_KEY for backward compatibility.
const PROFILES_KEY = 'nekromancer_profiles_v1';
// Shared, account-wide stash — one vault for ALL characters/saves, stored
// separately from any single hero so it never travels with a save slot.
const STASH_KEY = 'nekromancer_stash_v1';
const STASH_TIER_KEY = 'nekromancer_stashtier_v1';
// Per-EQUIP-SLOT capacity by upgrade tier, and the gold cost to reach each.
const STASH_PER_SLOT = [100, 1000, 5000, 10000];
const STASH_UP_COST = [0, 500000, 50000000, 999000000];

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
    const when = new Date();
    arr.push({
      // Auto-labelled "Level 13 — 8:41 AM".
      name: 'Level ' + Hero.level + ' — ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: when.toLocaleDateString(),
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
  name: 'The Nekromancer',
  eyeColor: '#6ff7c3',      // glowing-eye colour, chosen at character creation
  level: 1,
  xp: 0,
  gold: 0,
  mats: { parts: 0, dust: 0, crystal: 0, soul: 0, lumber: 0, rivets: 0, heartstring: 0 },
  gems: [],                 // [{type, tier}]
  bag: [],                  // unequipped items
  stash: [],                // shared vault, auto-sorted into equip-slot bins
  stashTier: 0,             // 0..3 → STASH_PER_SLOT capacity (account-wide)
  equipped: {},             // slot -> item
  // 6 slots, Diablo action bar: 0 primary (LMB) · 1 secondary (RMB) ·
  // 2-5 skills (keys 1-4).
  loadout: ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null],
  passives: [null, null, null, null, null],
  zonesCleared: 0,          // count of lands beaten (unlocks the next)
  actsCleared: 0,           // Story Mode acts finished (of 100 planned)
  difficulty: 0,
  bestZone: 0,
  totalKills: 0,
  riftsCleared: 0,
  riftKeys: 0,          // Nephalem Rift Keys (open Nephalem Rifts)
  masterKeys: 0,        // Master Nephalem Rift Keys (open Season rifts)
  artisans: { smith: 1, mystic: 1, jeweler: 1 },
  runes: {},                          // skillId -> rune id
  cheats: { god: false, essence: false, spawn: 0 }, // dev panel, kept per save
  bagTier: 0,               // purchased bag expansions (0 = base 24)
  BAG_SIZE: 24,             // derived from bagTier via applyBagSize()
  STASH_SIZE: 100,
  SAVE_VERSION: 3,   // v2: Epic rarity @ index 3 · v3: item.gem → item.gems[]

  fresh() {
    // name/eyeColor are chosen at character creation; keep any already set.
    if (!this.name) this.name = 'The Nekromancer';
    if (!this.eyeColor) this.eyeColor = '#6ff7c3';
    this.level = 1; this.xp = 0; this.gold = 0;
    this.mats = { parts: 0, dust: 0, crystal: 0, soul: 0, lumber: 0, rivets: 0, heartstring: 0 };
    this.gems = [];
    this.bag = [];
    // NOTE: stash is account-wide (shared vault) — a fresh character does NOT
    // clear it. It is loaded/kept via loadStash()/saveStash().
    this.equipped = {};
    // Every Nekromancer starts holding a Wood torch against the dark.
    if (typeof Items !== 'undefined' && Items.makeTorch) this.equipped.torch = Items.makeTorch('wood');
    this.loadout = ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null];
    this.passives = [null, null, null, null, null];
    this.zonesCleared = 0;
    this.actsCleared = 0;
    this.difficulty = 0;
    this.bestZone = 0;
    this.totalKills = 0;
    this.riftsCleared = 0;
    this.riftKeys = 0;
    this.masterKeys = 0;
    this.artisans = { smith: 1, mystic: 1, jeweler: 1 };
    this.runes = {};
    this.cheats = { god: false, essence: false, spawn: 0 };
    this.bagTier = 0;
    this.applyBagSize();
  },

  // Bag capacity grows with purchased upgrades.
  applyBagSize() {
    this.BAG_SIZE = this.bagTier > 0 && BAG_UPGRADES[this.bagTier - 1]
      ? BAG_UPGRADES[this.bagTier - 1].size : 24;
  },

  nextBagUpgrade() {
    return this.bagTier < BAG_UPGRADES.length ? BAG_UPGRADES[this.bagTier] : null;
  },

  buyBagUpgrade() {
    const up = this.nextBagUpgrade();
    if (!up) { UI.toast('Bag is already at maximum size', '#9a9080'); AudioSys.sfx('denied'); return; }
    if (this.gold < up.cost) { UI.toast('Not enough gold', '#9a9080'); AudioSys.sfx('denied'); return; }
    this.gold -= up.cost;
    this.bagTier++;
    this.applyBagSize();
    this.save();
    UI.toast('Bag expanded to ' + this.BAG_SIZE + ' slots', '#6ff7c3');
    AudioSys.sfx('level');
  },

  snapshot() {
    return {
      v: this.SAVE_VERSION,
      name: this.name, eyeColor: this.eyeColor,
      level: this.level, xp: this.xp, gold: this.gold, mats: this.mats,
      gems: this.gems, bag: this.bag, equipped: this.equipped,
      loadout: this.loadout, passives: this.passives,
      zonesCleared: this.zonesCleared, actsCleared: this.actsCleared, difficulty: this.difficulty,
      bestZone: this.bestZone, totalKills: this.totalKills,
      riftsCleared: this.riftsCleared, riftKeys: this.riftKeys, masterKeys: this.masterKeys,
      artisans: this.artisans, runes: this.runes, cheats: this.cheats,
      bagTier: this.bagTier
    };
  },

  // v2: Epic rarity (index 3) inserted — shift Legendary/Set up.
  // v3: single item.gem replaced by an item.gems[] array (multi-socket).
  migrate(d) {
    const v = d.v || 1;
    const each = fn => {
      (d.bag || []).forEach(fn);
      (d.stash || []).forEach(fn);
      for (const k of Object.keys(d.equipped || {})) fn(d.equipped[k]);
    };
    if (v < 2) {
      each(it => {
        if (!it) return;
        if (it.set) it.rarity = 5;
        else if (it.rarity >= 3) it.rarity = 4;
      });
    }
    if (v < 3) {
      each(it => {
        if (!it) return;
        if (it.gems === undefined) it.gems = it.gem ? [it.gem] : [];
        delete it.gem;
      });
    }
    d.v = 3;
    return d;
  },

  applySnapshot(d) {
    d = this.migrate(d);
    Object.assign(this, {
      name: d.name || 'The Nekromancer', eyeColor: d.eyeColor || '#6ff7c3',
      level: d.level || 1, xp: d.xp || 0, gold: d.gold || 0,
      mats: Object.assign({ parts: 0, dust: 0, crystal: 0, soul: 0, lumber: 0, rivets: 0, heartstring: 0 }, d.mats),
      gems: d.gems || [], bag: d.bag || [], equipped: d.equipped || {},
      loadout: d.loadout || ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null],
      passives: d.passives || [null, null, null, null, null],
      zonesCleared: d.zonesCleared || 0, actsCleared: d.actsCleared || 0, difficulty: d.difficulty || 0,
      bestZone: d.bestZone || 0, totalKills: d.totalKills || 0,
      riftsCleared: d.riftsCleared || 0, riftKeys: d.riftKeys || 0, masterKeys: d.masterKeys || 0,
      artisans: (() => {
        const a = Object.assign({ smith: 1, mystic: 1, jeweler: 1 }, d.artisans);
        for (const k of Object.keys(a)) a[k] = clamp(a[k], 1, 10); // artisans now cap at 10
        return a;
      })(),
      runes: d.runes || {},
      cheats: Object.assign({ god: false, essence: false, spawn: 0 }, d.cheats),
      bagTier: clamp(d.bagTier || 0, 0, BAG_UPGRADES.length)
    });
    this.applyBagSize();
    // Legacy migration: pre-shared saves embedded a per-character stash. If the
    // shared vault is still empty, absorb those items so nothing is lost.
    if (d.stash && d.stash.length && (!this.stash || !this.stash.length)) {
      this.stash = d.stash.slice(0, this.STASH_SIZE);
      this.saveStash();
    }
    this.sanitize();
    this.save();
    Items.apply();
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.snapshot()));
    } catch (e) { /* storage unavailable */ }
    this.saveStash();
    // Mirror into the active roster slot so profiles stay current.
    if (typeof Profiles !== 'undefined') Profiles.saveActive();
  },

  // --- Per-slot stash (auto-sorted, upgradable) ---
  // Items live in one shared array but are BINNED by equip-slot family; each bin
  // holds STASH_PER_SLOT[tier]. Torches stack and never count against a bin.
  stashPerSlot() { return STASH_PER_SLOT[clamp(this.stashTier || 0, 0, STASH_PER_SLOT.length - 1)]; },
  stashSlotCount(slot) {
    const fam = Items.slotFamily(slot);
    let n = 0;
    for (const it of this.stash) if (it && !it.torch && fam.includes(it.slot)) n++;
    return n;
  },
  stashSlotItems(slot) {
    const fam = Items.slotFamily(slot);
    return this.stash.filter(it => it && !it.torch && fam.includes(it.slot));
  },
  stashUpgradeCost() {
    const t = (this.stashTier || 0) + 1;
    return t < STASH_PER_SLOT.length ? STASH_UP_COST[t] : null;
  },
  buyStashUpgrade() {
    const cost = this.stashUpgradeCost();
    if (cost === null) return;
    if (this.gold < cost) { UI.toast('Not enough gold to upgrade the stash', '#9a9080'); AudioSys.sfx('denied'); return; }
    this.gold -= cost;
    this.stashTier++;
    this.saveStash(); this.save();
    UI.toast('Stash upgraded — ' + this.stashPerSlot().toLocaleString() + ' per slot', '#6ff7c3');
    AudioSys.sfx('craft');
  },

  // Persist the shared vault to its own key (never inside a save slot).
  saveStash() {
    try {
      localStorage.setItem(STASH_KEY, JSON.stringify(this.stash || []));
      localStorage.setItem(STASH_TIER_KEY, String(this.stashTier || 0));
    } catch (e) { /* storage unavailable */ }
  },

  // Load the shared vault. On first run after the shared-stash update, seed it
  // from the active character's legacy embedded stash (one-time migration).
  loadStash() {
    try {
      this.stashTier = clamp(+(localStorage.getItem(STASH_TIER_KEY) || 0) || 0, 0, STASH_PER_SLOT.length - 1);
      const raw = localStorage.getItem(STASH_KEY);
      if (raw !== null) { this.stash = JSON.parse(raw) || []; this.mergeStashTorches(); return; }
      // No shared vault yet — migrate from the current hero save if present.
      let seed = [];
      try {
        const hraw = localStorage.getItem(SAVE_KEY);
        if (hraw) { const hd = this.migrate(JSON.parse(hraw)); seed = hd.stash || []; }
      } catch (e) { /* ignore */ }
      this.stash = seed.slice(0, this.STASH_SIZE);
      this.mergeStashTorches();
      this.saveStash();
    } catch (e) { this.stash = this.stash || []; }
  },

  // Collapse duplicate torch entries into one stack per type (older saves kept
  // each crafted torch in its own slot).
  mergeStashTorches() {
    const byType = {};
    const merged = [];
    for (const it of this.stash || []) {
      if (it && it.torch) {
        if (byType[it.torch]) { byType[it.torch].count = (byType[it.torch].count || 1) + (it.count || 1); continue; }
        it.count = it.count || 1; byType[it.torch] = it;
      }
      merged.push(it);
    }
    this.stash = merged;
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
    // Ruby-in-helm XP bonus (and any future XP find) scales the gain.
    const xpBonus = (Game.player && Game.player.xpBonus) || 0;
    this.xp += Math.round(n * (1 + xpBonus));
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

  rune(skillId) {
    const id = this.runes[skillId] || 'base';
    // A rune you haven't reached the unlock level for falls back to base.
    if (typeof SKILL_RUNES !== 'undefined' && SKILL_RUNES[skillId]) {
      const r = SKILL_RUNES[skillId].find(x => x.id === id);
      if (r && r.lvl && this.level < r.lvl) return 'base';
    }
    return id;
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
    // Normalize to the 6-slot Diablo action bar (primary · secondary · 1-4).
    while (this.loadout.length < 6) this.loadout.push(null);
    if (this.loadout.length > 6) this.loadout.length = 6;
    for (let i = 0; i < this.loadout.length; i++) {
      const id = this.loadout[i];
      if (id && !SKILL_DATA.some(s => s.id === id && s.lvl <= this.level)) this.loadout[i] = null;
    }
    if (!this.loadout[0]) this.loadout[0] = 'boneSpikes';
    // Pad passives to the number of slots (a new lvl-3 slot was added).
    while (this.passives.length < PASSIVE_SLOT_LEVELS.length) this.passives.push(null);
    if (this.passives.length > PASSIVE_SLOT_LEVELS.length) this.passives.length = PASSIVE_SLOT_LEVELS.length;
  }
};

// The character roster: up to 3 heroes at once, chosen from the campfire
// select scene. The shared Stash is common to all of them.
const Profiles = {
  MAX: 3,
  slots: [null, null, null],
  active: 0,

  load() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.slots = (d.slots || []).slice(0, this.MAX);
        while (this.slots.length < this.MAX) this.slots.push(null);
        this.active = clamp(d.active || 0, 0, this.MAX - 1);
      }
    } catch (e) { /* ignore */ }
    // One-time migration: fold a legacy single hero into slot 0.
    if (!this.slots.some(Boolean)) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) { this.slots[0] = JSON.parse(raw); this.active = 0; this.persist(); }
      } catch (e) { /* ignore */ }
    }
  },

  persist() {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify({ slots: this.slots, active: this.active })); } catch (e) { /* ignore */ }
  },

  count() { return this.slots.filter(Boolean).length; },
  full() { return this.count() >= this.MAX; },
  firstEmpty() { return this.slots.findIndex(s => !s); },
  firstFilled() { const i = this.slots.findIndex(Boolean); return i < 0 ? 0 : i; },

  // Persist the currently-active Hero into its slot (called on every save).
  saveActive() {
    if (this.active >= 0 && this.active < this.MAX && this.slots[this.active] !== undefined) {
      this.slots[this.active] = Hero.snapshot();
      this.persist();
    }
  },

  // Load an existing profile into the active Hero.
  select(i) {
    if (!this.slots[i]) return false;
    this.active = i;
    Hero.applySnapshot(this.slots[i]);
    this.persist();
    return true;
  },

  // Start a brand-new hero in slot i (the creation screen then customizes it).
  create(i) {
    if (i < 0 || i >= this.MAX || this.slots[i]) return false;
    this.active = i;
    Hero.name = ''; Hero.eyeColor = '';
    Hero.fresh();
    this.slots[i] = Hero.snapshot();
    this.persist();
    return true;
  },

  remove(i) {
    if (i < 0 || i >= this.MAX) return;
    this.slots[i] = null;
    if (this.active === i) this.active = this.firstFilled();
    this.persist();
  },

  // Load the roster at boot and make the active (or first) hero current.
  boot() {
    this.load();
    const act = this.slots[this.active] ? this.active : this.firstFilled();
    if (this.slots[act]) { this.active = act; Hero.applySnapshot(this.slots[act]); return true; }
    Hero.fresh();
    return false;
  }
};
